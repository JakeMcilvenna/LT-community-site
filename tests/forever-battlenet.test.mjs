import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import test from 'node:test';

import { findOwnedForeverCharacter, normalizeForeverAccountCharacters } from '../lib/battlenet/forever-verification.ts';
import * as recruitmentData from '../data/recruitment-application.ts';
import * as recruitmentValidation from '../lib/recruitment-validation.ts';
import { createBotGhostVariable } from '../lib/botghost-values.ts';
import { enrichForeverCharacter } from '../lib/battlenet/forever-character-details.ts';

const require = createRequire(import.meta.url);
const profile = { wow_accounts: [{ characters: [
  { id: 42, name: 'Asha', surname: 'Brightvale', level: 25, playable_class: { name: 'Mage' }, faction: { name: 'Alliance' } },
  { id: 43, name: 'Björn', surname: 'Ashvale', level: 10 },
] }] };

test('Forever account characters use both names without requiring Retail realm fields', () => {
  assert.deepEqual(normalizeForeverAccountCharacters(profile, 'eu')[0], {
    id: '42', name: 'Asha', surname: 'Brightvale', fullName: 'Asha Brightvale',
    region: 'eu', level: 25, className: 'Mage', faction: 'Alliance',
  });
  assert.equal(normalizeForeverAccountCharacters(profile, 'eu')[1].fullName, 'Björn Ashvale');
});

test('Forever ownership rejects other characters and partial names', () => {
  const characters = normalizeForeverAccountCharacters(profile, 'eu');
  assert.equal(findOwnedForeverCharacter(characters, 'Asha Brightvale')?.id, '42');
  assert.equal(findOwnedForeverCharacter(characters, 'Asha Othername'), null);
  assert.equal(findOwnedForeverCharacter(characters, 'Asha'), null);
});

test('Forever normalization rejects malformed or Retail profiles and handles empty accounts', () => {
  assert.throws(() => normalizeForeverAccountCharacters({ wow_accounts: [{ characters: [{ id: 42, name: 'Retail', level: 80, realm: { name: 'Realm' } }] }] }, 'eu'));
  assert.throws(() => normalizeForeverAccountCharacters({ wow_accounts: 'invalid' }, 'eu'));
  assert.deepEqual(normalizeForeverAccountCharacters({ wow_accounts: [] }, 'eu'), []);
});

test('Forever names stay distinct when IDs collide across accounts or rulesets', () => {
  const character = profile.wow_accounts[0].characters[0];
  const characters = normalizeForeverAccountCharacters({ wow_accounts: [
    { characters: [character] },
    { characters: [{ ...character, surname: 'Othername' }, character] },
  ] }, 'eu');
  assert.equal(characters.length, 2);
  assert.equal(findOwnedForeverCharacter(characters, 'Asha Othername')?.fullName, 'Asha Othername');
});

async function loadClient(fetch) {
  const ts = require('typescript');
  const source = await readFile(new URL('../lib/battlenet/forever-client.ts', import.meta.url), 'utf8');
  const exports = {};
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, {
    exports, URL, AbortSignal, fetch,
    require: (name) => {
      if (name === 'server-only') return {};
      if (name === './forever-verification') return { findOwnedForeverCharacter, normalizeForeverAccountCharacters };
      if (name === './forever-character-details') return { enrichForeverCharacter };
      throw new Error(`Unexpected dependency: ${name}`);
    },
  });
  return exports;
}

const session = { accessToken: 'test-user-token', region: 'eu' };

test('Forever lookup uses the authenticated account endpoint and Forever namespace', async () => {
  const calls = [];
  const client = await loadClient(async (url, options) => {
    calls.push({ url: new URL(url), options });
    return Response.json(profile);
  });
  assert.equal((await client.getOwnedForeverCharacters(session))[0].fullName, 'Asha Brightvale');
  assert.equal(calls[0].url.origin, 'https://eu.api.blizzard.com');
  assert.equal(calls[0].url.pathname, '/profile/user/wow');
  assert.equal(calls[0].url.searchParams.get('namespace'), 'profile-forever-eu');
  assert.equal(calls[0].options.headers.Authorization, 'Bearer test-user-token');
  assert.equal(calls[0].options.cache, 'no-store');
});

test('Forever submission verification re-reads ownership and rejects forged names', async () => {
  let calls = 0;
  const client = await loadClient(async () => { calls++; return Response.json(profile); });
  assert.equal((await client.resolveOwnedForeverCharacter(session, 'Asha Brightvale'))?.id, '42');
  assert.equal(await client.resolveOwnedForeverCharacter(session, 'Notmine Brightvale'), null);
  assert.equal(calls, 2);
});

test('Forever lookup distinguishes expired authorization and provider outages', async () => {
  for (const status of [401, 403, 404, 500]) {
    const client = await loadClient(async () => new Response('', { status }));
    await assert.rejects(client.getOwnedForeverCharacters(session), {
      message: status === 401 || status === 403 ? 'BATTLENET_SESSION_EXPIRED' : 'BATTLENET_UNAVAILABLE',
    });
  }
});

test('Forever details recheck ownership before querying public profile endpoints', async () => {
  const calls = [];
  const client = await loadClient(async (url) => { calls.push(new URL(url)); return Response.json(profile); });
  assert.equal(await client.getForeverCharacterDetails(session, 'Notmine Brightvale'), null);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].pathname, '/profile/user/wow');
});

test('Forever optional profile failures preserve the selected account character', async () => {
  const client = await loadClient(async (url) => new URL(url).pathname === '/profile/user/wow'
    ? Response.json(profile) : new Response('', { status: 404 }));
  const details = await client.getForeverCharacterDetails(session, 'Asha Brightvale');
  assert.equal(details.fullName, 'Asha Brightvale');
  assert.equal(details.className, 'Mage');
  assert.equal(details.level, 25);
  assert.equal(details.specialization, undefined);
  assert.match(details.armoryUrl, /\/forever\/eu\/armory\/character\/asha-brightvale$/);
  assert.equal(details.raiderIoProfileUrl, undefined);
});

test('Forever profile and talent queries use realmless paths in parallel', async () => {
  const profileCalls = [];
  const client = await loadClient(async (url) => {
    const parsed = new URL(url);
    if (parsed.pathname === '/profile/user/wow') return Response.json(profile);
    profileCalls.push(parsed);
    return Response.json(parsed.pathname.endsWith('/specializations')
      ? { character: { id: 42, name: 'Asha', surname: 'Brightvale' }, specialization_groups: [{ is_active: true, specializations: [{ specialization_name: 'Frost', spent_points: 16 }] }] }
      : { id: 42, name: 'Asha', surname: 'Brightvale', level: 26, character_class: { name: 'Mage' }, ruleset: { id: 1, name: 'PvP' } });
  });
  const details = await client.getForeverCharacterDetails(session, 'Asha Brightvale');
  assert.equal(profileCalls.length, 2);
  assert(profileCalls.every((url) => url.pathname.startsWith('/profile/wow/character/asha-brightvale') && url.searchParams.get('namespace') === 'profile-forever-eu'));
  assert.equal(details.level, 26);
  assert.equal(details.specialization, 'Frost');
  assert.equal(details.raiderIoProfileUrl, 'https://forever.raider.io/characters/eu/pvp/Asha%20Brightvale');
});

async function submissionHarness(ownedCharacter) {
  const source = await readFile(new URL('../app/api/recruitment/route.ts', import.meta.url), 'utf8');
  const ts = require('typescript');
  const exports = {};
  const deliveries = [];
  const signedSession = { ...session, battleTag: 'Owner#1234', accountId: '123' };
  const dependencies = {
    'node:crypto': require('node:crypto'),
    'next/server': require('next/server'),
    zod: require('zod'),
    '@/data/recruitment-application': recruitmentData,
    '@/lib/recruitment-validation': recruitmentValidation,
    '@/lib/botghost-values': { createBotGhostVariable },
    '@/lib/battlenet/types': { BATTLE_NET_REGIONS: ['eu', 'us', 'kr', 'tw'] },
    '@/lib/battlenet/session': { BATTLE_NET_SESSION_COOKIE: 'session', readRecruitmentSession: () => signedSession },
    '@/lib/battlenet/forever-client': { resolveOwnedForeverCharacter: async (actualSession, name) => {
      assert.equal(actualSession, signedSession);
      return ownedCharacter?.fullName === name ? ownedCharacter : null;
    } },
    '@/lib/application-token': { verifyApplicationToken: () => ({ applicationType: 'forever', discordUserId: '12345678901234567', discordTag: 'tester' }) },
    '@/lib/botghost': { sendBotGhostApplication: async (payload) => { deliveries.push(payload); } },
  };
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, {
    exports, URL, File, FormData, Blob, console, process: { env: { NEXT_PUBLIC_SITE_URL: 'https://guild.test' } },
    require: (name) => dependencies[name] ?? {},
  });
  const form = new FormData();
  for (const [key, value] of Object.entries({
    applicationType: 'forever', applicationToken: 'test-token', battleTagSource: 'battlenet', characterSource: 'battlenet',
    characterName: 'Asha Brightvale', characterId: 'forged-id', characterVerified: 'true', battleTag: 'Forged#1234',
    email: '', country: 'UK', age: '25', referral: 'Friend', consent: 'accepted', website: '',
    roleInterests: 'Tank', characterPlans: 'Warrior', gameGoals: 'Raiding', experienceLevel: 'Returning player',
    typicalAvailability: 'Evenings', foreverMotivation: 'Community', communityContribution: 'Help others',
  })) form.set(key, value);
  return { deliveries, form, submit: () => exports.POST({
    headers: new Headers(), cookies: { get: () => undefined }, formData: async () => form,
  }) };
}

test('Forever submission sends the server-verified name and ID, ignoring forged fields', async () => {
  const owned = normalizeForeverAccountCharacters(profile, 'eu')[0];
  const harness = await submissionHarness(owned);
  const response = await harness.submit();
  assert.equal(response.status, 200);
  const variables = Object.fromEntries(harness.deliveries[0].variables.map(({ name, value }) => [name, value]));
  assert.equal(variables.character, 'Asha Brightvale');
  assert.equal(variables.character_id, '42');
  assert.equal(variables.battletag, 'Owner#1234');
  assert.equal(variables.character_verified, 'Yes');
});

test('Forever submission rejects a character absent from the authenticated account', async () => {
  const harness = await submissionHarness(null);
  assert.equal((await harness.submit()).status, 409);
  assert.equal(harness.deliveries.length, 0);
});

test('Forever manual fallback cannot claim verified character ownership', async () => {
  const harness = await submissionHarness(null);
  harness.form.set('characterSource', 'manual');
  const response = await harness.submit();
  assert.equal(response.status, 200);
  const variables = Object.fromEntries(harness.deliveries[0].variables.map(({ name, value }) => [name, value]));
  assert.equal(variables.character_verified, 'No');
  assert.equal(variables.character_id, 'Not provided');
});
