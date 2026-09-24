import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  createOAuthFlow,
  createRecruitmentSession,
  isOAuthStateValid,
  readOAuthFlow,
  readRecruitmentSession,
} from '../lib/battlenet/session-core.ts';
import { findOwnedCharacter, normalizeAccountCharacters } from '../lib/battlenet/verification.ts';
import { buildCharacterProfileLinks } from '../lib/character-profile-links.ts';
import { isWarcraftLogsUrl } from '../lib/recruitment-validation.ts';

process.env.BATTLENET_SESSION_SECRET = 'test-only-secret-that-is-longer-than-thirty-two-characters';

const profile = {
  wow_accounts: [{
    characters: [{
      id: 42,
      name: 'Examplemage',
      level: 80,
      realm: { id: 3391, name: 'Tarren Mill', slug: 'tarren-mill' },
      playable_class: { id: 8, name: 'Mage' },
      faction: { type: 'HORDE' },
    }],
  }],
};

test('OAuth state round-trips with BotGhost application context', () => {
  const returnTo = '/recruitment?token=signed-application-token';
  const created = createOAuthFlow('eu', returnTo);
  const decoded = readOAuthFlow(created.cookieValue);
  assert.equal(decoded?.returnTo, returnTo);
  assert.equal(isOAuthStateValid(decoded, created.flow.state), true);
});

test('invalid OAuth state is rejected', () => {
  const { flow } = createOAuthFlow('eu', '/recruitment');
  assert.equal(isOAuthStateValid(flow, 'not-the-right-state'), false);
  assert.equal(isOAuthStateValid(flow, null), false);
});

test('expired OAuth state is rejected', () => {
  const realNow = Date.now;
  const { cookieValue } = createOAuthFlow('eu', '/recruitment');
  Date.now = () => realNow() + 11 * 60 * 1_000;
  try { assert.equal(readOAuthFlow(cookieValue), null); } finally { Date.now = realNow; }
});

test('tampered encrypted session is rejected', () => {
  const created = createRecruitmentSession({ accessToken: 'secret-token', battleTag: 'Example#1234', accountId: '123', region: 'eu', providerExpiresIn: 3600 });
  assert.equal(readRecruitmentSession(`${created.cookieValue}x`), null);
  assert.equal(readRecruitmentSession(created.cookieValue)?.battleTag, 'Example#1234');
});

test('Blizzard account characters normalize to the internal type', () => {
  assert.deepEqual(normalizeAccountCharacters(profile, 'eu')[0], {
    id: '42', name: 'Examplemage', realmName: 'Tarren Mill', realmSlug: 'tarren-mill',
    realmId: 3391, region: 'eu', level: 80, className: 'Mage', classId: 8, faction: 'Horde',
  });
});

test('only a character returned for the connected account can be selected', () => {
  const characters = normalizeAccountCharacters(profile, 'eu');
  assert.equal(findOwnedCharacter(characters, '42')?.name, 'Examplemage');
  assert.equal(findOwnedCharacter(characters, '999999'), null);
});

test('malformed Blizzard profiles fail closed', () => {
  assert.throws(() => normalizeAccountCharacters({ wow_accounts: [{ characters: [{ id: 1 }] }] }, 'eu'));
});

test('Warcraft Logs hostname validation accepts only the domain or a real subdomain', () => {
  assert.equal(isWarcraftLogsUrl('https://warcraftlogs.com/character/eu/x/y'), true);
  assert.equal(isWarcraftLogsUrl('https://www.warcraftlogs.com/character/eu/x/y'), true);
  assert.equal(isWarcraftLogsUrl('https://notwarcraftlogs.com/character/eu/x/y'), false);
  assert.equal(isWarcraftLogsUrl('https://warcraftlogs.com.evil.example/'), false);
});

test('verified character identity produces all three profile links', () => {
  assert.deepEqual(buildCharacterProfileLinks({
    region: 'eu',
    realmSlug: 'twisting-nether',
    characterName: 'Moistbrew',
    raiderIoProfileUrl: 'https://raider.io/characters/eu/twisting-nether/Moistbrew',
  }), {
    raiderIo: 'https://raider.io/characters/eu/twisting-nether/Moistbrew',
    warcraftLogs: 'https://www.warcraftlogs.com/character/eu/twisting-nether/moistbrew',
    armory: 'https://worldofwarcraft.blizzard.com/en-gb/character/eu/twisting-nether/moistbrew',
  });
});

test('submission reconstructs protected fields from verified server data', async () => {
  const source = await readFile(new URL('../app/api/recruitment/route.ts', import.meta.url), 'utf8');
  for (const field of ['battleTag', 'characterName', 'realm', 'className', 'specialization']) {
    assert.match(source, new RegExp(`${field}: verifiedRetail\\?\\.${field}`));
  }
  assert.match(source, /resolveVerifiedCharacter\(battleNetSession, characterId\)/);
  assert.match(source, /warcraftLogsUrl: verifiedRetail\?\.warcraftLogsUrl \?\? formData\.get\("warcraftLogsUrl"\)/);
});

test('manual Retail submissions bypass Battle.net and remain unverified', async () => {
  const source = await readFile(new URL('../app/api/recruitment/route.ts', import.meta.url), 'utf8');
  assert.match(source, /submittedApplicationType === "retail" && submittedCharacterSource === "battlenet"/);
  assert.match(source, /characterSource: z\.literal\("manual"\)/);
  assert.match(source, /battleNetVerified: z\.literal\(false\)/);
  assert.match(source, /battleNetVerified: submittedApplicationType === "forever" \? Boolean\(foreverBattleNetSession\) : submittedCharacterSource === "battlenet" \? Boolean\(verifiedRetail\) : false/);
});

test('Warcraft Logs input is shown only for manual character entry', async () => {
  const source = await readFile(new URL('../components/recruitment/RecruitmentApplicationForm.tsx', import.meta.url), 'utf8');
  const logsSection = source.slice(
    source.indexOf("{characterSource === 'manual' ? ("),
    source.indexOf("title='Availability and communication'"),
  );
  assert.match(logsSection, /name='warcraftLogsUrl'/);
  assert.match(logsSection, /not ownership verified/);
  assert.doesNotMatch(source, /battleNetWarcraftLogsUrl/);
});

test('forged Battle.net mode still requires a session and ownership check', async () => {
  const source = await readFile(new URL('../app/api/recruitment/route.ts', import.meta.url), 'utf8');
  const verifiedBranch = source.slice(
    source.indexOf('if (submittedApplicationType === "retail" && submittedCharacterSource === "battlenet")'),
    source.indexOf('const parsed = applicationSchema.safeParse'),
  );
  assert.match(verifiedBranch, /readRecruitmentSession/);
  assert.match(verifiedBranch, /if \(!battleNetSession\)/);
  assert.match(verifiedBranch, /resolveVerifiedCharacter\(battleNetSession, characterId\)/);
});

test('new BotGhost verified variables remain mapped', async () => {
  const source = await readFile(new URL('../app/api/recruitment/route.ts', import.meta.url), 'utf8');
  for (const name of ['character_source', 'battle_net_verified', 'battle_net_account_id', 'battle_net_region', 'character_id', 'realm_slug', 'region', 'level', 'faction', 'item_level', 'raider_io_score', 'raid_progression', 'raider_io_profile_url']) {
    assert.match(source, new RegExp(`createBotGhostVariable\\("${name}"`));
  }
  assert.match(source, /application\.characterSource === "battlenet" \? "Battle\.net" : "Manual"/);
  assert.match(source, /application\.characterSource === "battlenet" \? application\.characterId : undefined/);
});

test('Discord submissions resolve the BotGhost-created channel before changing the success action', async () => {
  const [submissionSource, statusRouteSource, pageSource, formSource] = await Promise.all([
    readFile(new URL('../app/api/recruitment/route.ts', import.meta.url), 'utf8'),
    readFile(new URL('../app/api/discord/application-status/route.ts', import.meta.url), 'utf8'),
    readFile(new URL('../app/recruitment/page.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../components/recruitment/RecruitmentApplicationForm.tsx', import.meta.url), 'utf8'),
  ]);

  assert.match(submissionSource, /createBotGhostVariable\("application_status_id", applicationStatusId\)/);
  assert.match(submissionSource, /application_status_callback_url/);
  assert.match(statusRouteSource, /recordApplicationChannel/);
  assert.match(statusRouteSource, /https:\/\/discord\.com\/channels\/\$\{guildId\}\/\$\{channelId\}/);
  assert.match(pageSource, /https:\/\/discord\.com\/channels\/\$\{verifiedToken\.guildId\}/);
  assert.match(formSource, /'Check application status'/);
  assert.match(formSource, /Preparing Discord channel/);
  assert.match(formSource, /Join the Discord server/);
});

test('application summaries and direct Discord embeds distinguish verified and manual characters', async () => {
  const source = await readFile(new URL('../app/api/recruitment/route.ts', import.meta.url), 'utf8');
  assert.match(source, /`\*\*Character source:\*\* \$\{verified \? "Battle\.net" : "Manual"\}`/);
  assert.match(source, /`\*\*Battle\.net:\*\* \$\{verified \? "Verified" : "Not verified"\}`/);
  assert.match(source, /verified \? "⚔️ Verified character" : "⚔️ Manually entered character"/);
  assert.match(source, /Ownership has not been verified through Battle\.net/);
});

test('switching character modes preserves unrelated form answers', async () => {
  const source = await readFile(new URL('../components/recruitment/RecruitmentApplicationForm.tsx', import.meta.url), 'utf8');
  const switchHandler = source.slice(
    source.indexOf('const selectCharacterSource'),
    source.indexOf('const onSubmit'),
  );
  assert.match(switchHandler, /setCharacterSource\(source\)/);
  assert.doesNotMatch(switchHandler, /battlenet\/disconnect/);
  assert.doesNotMatch(switchHandler, /reset\(/);
});

test('verified character selection is restored across page navigation and remains editable through the selector', async () => {
  const source = await readFile(new URL('../components/recruitment/BattleNetCharacterPicker.tsx', import.meta.url), 'utf8');
  assert.match(source, /sessionStorage\.setItem\(CHARACTER_SELECTION_STORAGE_KEY, characterId\)/);
  assert.match(source, /sessionStorage\.getItem\(CHARACTER_SELECTION_STORAGE_KEY\)/);
  assert.match(source, /body\.characters\.some\(\(character\) => character\.id === storedCharacterId\)/);
  assert.match(source, /void chooseCharacter\(storedCharacterId\)/);
  assert.match(source, /id='battleNetCharacterId'/);
  assert.match(source, /onChange=\{\(event\) => void chooseCharacter\(event\.currentTarget\.value\)\}/);
  assert.doesNotMatch(source, /> Change character/);
});

test('Forever offers Battle.net and manual BattleTag entry without exposing character selection', async () => {
  const formSource = await readFile(new URL('../components/recruitment/RecruitmentApplicationForm.tsx', import.meta.url), 'utf8');
  const controlSource = await readFile(new URL('../components/recruitment/BattleNetIdentityControl.tsx', import.meta.url), 'utf8');
  const hookSource = await readFile(new URL('../components/recruitment/useBattleNetIdentity.ts', import.meta.url), 'utf8');
  const identitySource = await readFile(new URL('../app/api/battlenet/identity/route.ts', import.meta.url), 'utf8');
  const foreverForm = formSource.slice(
    formSource.indexOf('function ForeverApplicationForm'),
    formSource.indexOf('export function RecruitmentApplicationForm'),
  );

  assert.match(hookSource, /fetch\('\/api\/battlenet\/identity'/);
  assert.match(hookSource, /sessionStorage\.setItem\(MANUAL_BATTLE_TAG_STORAGE_KEY, battleTag\)/);
  assert.match(controlSource, /Connect Battle\.net/);
  assert.match(controlSource, /Enter manually/);
	assert.match(controlSource, /Secure Battle\.net sign-in/);
	assert.match(controlSource, /We never see your password/);
	assert.match(controlSource, /Limited account access/);
  assert.match(controlSource, /WoW Forever character selection is not currently available through/);
  assert.match(foreverForm, /sourceName='battleTagSource'/);
  assert.doesNotMatch(foreverForm, /BattleNetCharacterPicker/);
  assert.doesNotMatch(identitySource, /getOwnedCharacters|characters/);
  assert.match(identitySource, /battleTag: session\.battleTag/);
});

test('Forever uses strict verified and manual BattleTag schemas', async () => {
  const source = await readFile(new URL('../app/api/recruitment/route.ts', import.meta.url), 'utf8');
  assert.match(source, /battleTagSource: z\.literal\("battlenet"\)/);
  assert.match(source, /battleNetVerified: z\.literal\(true\)/);
  assert.match(source, /battleTagSource: z\.literal\("manual"\)/);
  assert.match(source, /battleNetVerified: z\.literal\(false\)/);
  assert.match(source, /z\.discriminatedUnion\("battleTagSource"/);
});

test('Forever faction is fixed to Alliance by the server and is not an applicant preference', async () => {
  const formSource = await readFile(new URL('../components/recruitment/RecruitmentApplicationForm.tsx', import.meta.url), 'utf8');
  const routeSource = await readFile(new URL('../app/api/recruitment/route.ts', import.meta.url), 'utf8');
  const dataSource = await readFile(new URL('../data/recruitment-application.ts', import.meta.url), 'utf8');

  assert.doesNotMatch(formSource, /factionPreference|Faction preference/);
  assert.match(dataSource, /foreverFaction = "Alliance" as const/);
  assert.match(routeSource, /faction: submittedApplicationType === "forever" \? foreverFaction : verifiedRetail\?\.faction/);
  assert.doesNotMatch(routeSource, /formData\.get\("factionPreference"\)/);
  assert.doesNotMatch(routeSource, /application\.factionPreference/);
  assert.equal([...routeSource.matchAll(/createBotGhostVariable\("faction"/g)].length, 1, 'only Retail sends faction to BotGhost');
});

test('Forever submissions trust the signed Battle.net session BattleTag when available', async () => {
  const source = await readFile(new URL('../app/api/recruitment/route.ts', import.meta.url), 'utf8');
  assert.match(source, /submittedApplicationType === "forever"/);
  assert.match(source, /submittedBattleTagSource === "battlenet"/);
  assert.match(source, /Reconnect or enter your BattleTag manually/);
  assert.match(source, /verifiedRetail\?\.battleTag \?\? foreverBattleNetSession\?\.battleTag \?\? formData\.get\("battleTag"\)/);
});

test('disconnect only clears the Battle.net recruitment cookie', async () => {
  const source = await readFile(new URL('../app/api/auth/battlenet/disconnect/route.ts', import.meta.url), 'utf8');
  assert.match(source, /cookies\.delete\(BATTLE_NET_SESSION_COOKIE\)/);
  assert.doesNotMatch(source, /APPLICATION_TOKEN/);
});

test('Raider.IO failures are non-fatal enrichment failures', async () => {
  const source = await readFile(new URL('../lib/raiderio/client.ts', import.meta.url), 'utf8');
  assert.match(source, /response\.status === 429\) return null/);
  assert.match(source, /catch \{\s*return null;/);
});
