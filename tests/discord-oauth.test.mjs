import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  createDiscordOAuthFlow,
  isDiscordOAuthStateValid,
  readDiscordOAuthFlow,
} from '../lib/discord-oauth-flow-core.ts';

process.env.APPLICATION_TOKEN_SECRET = 'test-only-application-secret-long-enough-for-tests';

test('Discord OAuth state round-trips with its application type', () => {
  const created = createDiscordOAuthFlow('forever');
  const decoded = readDiscordOAuthFlow(created.cookieValue);

  assert.equal(decoded?.applicationType, 'forever');
  assert.equal(isDiscordOAuthStateValid(decoded, created.flow.state), true);
});

test('Discord OAuth state rejects tampering and mismatches', () => {
  const created = createDiscordOAuthFlow('retail');

  assert.equal(readDiscordOAuthFlow(`${created.cookieValue}x`), null);
  assert.equal(isDiscordOAuthStateValid(created.flow, 'wrong-state'), false);
});

test('Discord OAuth flow expires after ten minutes', () => {
  const realNow = Date.now;
  const created = createDiscordOAuthFlow('retail');
  Date.now = () => realNow() + 11 * 60 * 1_000;
  try {
    assert.equal(readDiscordOAuthFlow(created.cookieValue), null);
  } finally {
    Date.now = realNow;
  }
});

test('direct applications authenticate, join Discord, then use the BotGhost path', async () => {
  const [formSource, routeSource, callbackSource, oauthSource] = await Promise.all([
    readFile(new URL('../components/recruitment/RecruitmentApplicationForm.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../app/api/recruitment/route.ts', import.meta.url), 'utf8'),
    readFile(new URL('../app/api/auth/discord/callback/route.ts', import.meta.url), 'utf8'),
    readFile(new URL('../lib/discord-oauth.ts', import.meta.url), 'utf8'),
  ]);

  assert.match(formSource, /Join Discord & submit/);
  assert.match(formSource, /connectDiscord\('retail'\)/);
  assert.match(formSource, /connectDiscord\('forever'\)/);
  assert.match(formSource, /applicationToken && discordIdentity/);
  assert.match(formSource, /Received securely from your Discord application link/);
  assert.match(routeSource, /DISCORD_APPLICATION_COOKIE/);
  assert.match(routeSource, /Join Discord and verify your account before submitting/);
  assert.match(callbackSource, /addDiscordGuildMember/);
  assert.match(callbackSource, /createApplicationToken/);
  assert.match(oauthSource, /scope", "identify guilds\.join"/);
  assert.match(oauthSource, /\/guilds\/\$\{guildId\}\/members\/\$\{userId\}/);
});
