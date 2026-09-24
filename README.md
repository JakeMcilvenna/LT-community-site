# Last Try guild website

A production-ready Next.js App Router website for the World of Warcraft guild Last Try. The site uses TypeScript, Tailwind CSS, Motion, Server Components, typed local content, and server-only adapters for WoW Audit and Twitch.

## Run locally

Requires Node.js 20.9 or newer.

```bash
npm install
copy .env.example .env.local
npm run dev
```

Open `http://localhost:3000`.

Quality checks:

```bash
npm run typecheck
npm run lint
npm run build
```

## Environment variables

Create `.env.local`. It is ignored by Git.

```env
WOWAUDIT_API_KEY=
WOWAUDIT_SPREADSHEET_KEY=

DISCORD_RECRUITMENT_WEBHOOK_URL=
DISCORD_FOREVER_RECRUITMENT_WEBHOOK_URL=

TWITCH_CLIENT_ID=
TWITCH_CLIENT_SECRET=

NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Never use a `NEXT_PUBLIC_` prefix for the WoW Audit key or Twitch secret.

## Guild configuration

Edit `config/guild.ts` for the guild name, tagline, region, realm, timezone, application URL, navigation, and verified social links. Empty social links are not rendered.

## Hero and raid assets

The homepage uses:

```text
public/videos/hero-video.mp4
public/images/hero-poster.jpg
```

The supplied source video is preserved at `assets/hero-video.mp4`. Replace the public video file when publishing a new cut. Keep the file compressed, muted-compatible, and broadly supported as H.264 MP4.

Raid art lives in season-specific folders:

```text
public/images/raids/midnight-season-1/
public/images/raids/midnight-season-2/
```

Boss cards use a large raid image plus a small encounter icon. If the tier changes, create a new folder, update paths in `data/raid-progression.ts`, and keep all images local so a remote host cannot break the progression grid.

## Edit raid progression

Live boss progression is loaded server-side from Raider.IO for the guild configured in `config/guild.ts` and refreshed every five minutes. An undefeated boss card also shows the guild's best recorded health percentage for the selected difficulty when live pull data is available. Raider.IO does not require an API key at this request volume; `RAIDER_IO_ACCESS_KEY` can optionally be configured for a higher rate limit.

Best-percent data depends on the raid logger running the Raider.IO desktop client with Live Tracking enabled. The site identifies the active difficulty and first undefeated encounter from the standard progression feed, then makes one live-progress request for that raid. It hides empty `100%` / zero-pull responses and keeps the standard Raider.IO encounter feed as the source of truth for boss kills.

`data/raid-progression.ts` supplies raid metadata, encounter slugs, artwork, and fallback kill states. Each boss has:

```ts
heroicDefeated: true
mythicDefeated: false
```

Changing either boolean updates the fallback boss colour state and recalculates the Heroic or Mythic total for that season. Live Raider.IO data takes precedence when it is available.

The season filter is populated from the `raidTiers` array, whose first entry is the default view. The model supports multiple raid instances within one tier. Add, remove, or reorder seasons and bosses through the typed data file.

## Edit members

Edit `data/members.ts`. Roles, ranks, classes, specialisations, and Twitch usernames are all optional typed fields. The Members page derives its role, class, and rank filters from this file.

Only add a real Twitch username. The site never invents live status or viewer counts.

### Live guild ranks (optional)

Add `BLIZZARD_CLIENT_ID` and `BLIZZARD_CLIENT_SECRET` from a Blizzard Developer application to show live leadership ranks from Blizzard's official guild roster. It refreshes every five minutes and shows the Guild Master (rank 0) and Officers (rank 1) on member cards. Blizzard supplies rank positions rather than custom guild-rank labels, so this guild treats rank 1 as Officer. Without these credentials, the site keeps using the rank provided by WoW Audit or the local backup roster.

## Events and WoW Audit

When `WOWAUDIT_API_KEY` is configured, the Events page and homepage preview use WoW Audit's `/v1/raids` feed. Raid dates, times, instances, difficulty, status, optional status, and signup totals refresh every five minutes. If the raids endpoint is temporarily unavailable, the site uses the team's WoW Audit raid-day schedule; `data/events.ts` is the final safe fallback.

Edit `data/events.ts` only for the local fallback. Each template includes a weekday, start and end time, event type, description, location, and recurring label.

Weekdays use:

```text
0 Sunday
1 Monday
2 Tuesday
3 Wednesday
4 Thursday
5 Friday
6 Saturday
```

Upcoming dates are generated in the timezone set in `config/guild.ts`, so the schedule does not expire as static dates pass.

### Raid-Helper (optional event provider)

The current event path remains the default. To automatically show every Raid-Helper event created on your Discord server, add the server ID and its Raid-Helper server API key, then switch the provider:

```env
EVENT_PROVIDER=raid-helper
RAID_HELPER_SERVER_ID=123456789012345678
RAID_HELPER_API_KEY=your_raid_helper_server_api_key
```

The server ID is your Discord server ID; enable Discord Developer Mode, then right-click the server and choose **Copy Server ID**. In your Discord server, run `/apikey show` to view its server API key, or `/apikey refresh` to create a new one. Raid-Helper limits these commands to members with **Administrator** or **Manage Server** permission. The integration reads Raid-Helper's server-wide v4 events feed server-side every minute, so newly created, edited, or removed events appear automatically without adding IDs to the website. It also adds a Sign up link to every event. No Raid-Helper credentials are sent to the browser.

If the provider is not configured or Raid-Helper cannot return a usable event, the site keeps the existing WoW Audit/local fallback instead of leaving the calendar empty. Set `EVENT_PROVIDER=wowaudit` (or remove it) to return to the existing behaviour.

## Recruitment and Discord

The Recruitment page contains switchable first-party application forms for Retail WoW and Warcraft Forever. Submissions are validated in `app/api/recruitment/route.ts` and sent server-side to separate private Discord channels. The webhook URLs never reach client JavaScript.

Create one webhook for each private recruitment-review channel in Discord, then add both URLs to `.env.local`:

```env
DISCORD_RECRUITMENT_WEBHOOK_URL=https://discord.com/api/webhooks/...
DISCORD_FOREVER_RECRUITMENT_WEBHOOK_URL=https://discord.com/api/webhooks/...
```

Retail submissions continue to use `DISCORD_RECRUITMENT_WEBHOOK_URL`; Warcraft Forever submissions use `DISCORD_FOREVER_RECRUITMENT_WEBHOOK_URL`. Each Discord submission includes a tailored review embed and the complete untruncated application as a text attachment. Retail applications also retain the optional UI screenshot upload. Screenshots accept JPG, PNG, and WebP files up to 4 MB. The endpoint also checks same-origin requests, uses a honeypot, disables Discord mentions, and applies a small per-IP rate limit. Duplicate protection is separate for each version, so the same player can apply to both guilds.

Application questions live in `data/recruitment-application.ts`. Update that file and the corresponding validation and Discord formatting in `app/api/recruitment/route.ts` when changing the form contract.

Discord-origin submissions receive an `event_application_status_id` and an `event_application_status_callback_url` in the BotGhost application webhook. After each **Create a Channel** block, add a **Send an API Request** block so the website can learn the ID BotGhost just created:

- Method: `POST`
- URL: `{event_application_status_callback_url}`
- Header: `x-botghost-secret` with the same value as `BOTGHOST_LINK_SECRET`
- JSON body on the Retail branch: `{"applicationStatusId":"{event_application_status_id}","channelId":"{retail_channel}"}`
- JSON body on the Forever branch: `{"applicationStatusId":"{event_application_status_id}","channelId":"{forever_channel}"}`

The Create Channel blocks already expose `{retail_channel}` and `{forever_channel}` as their Channel ID variables. The success screen polls briefly for this callback, then changes to **Check application status** and opens the applicant's exact private Discord channel. If BotGhost takes longer than 30 seconds or the callback fails, the page falls back to **Return to Discord**. Applications opened naturally on the website continue to show the normal Discord invite button.

### Battle.net verification for Retail applications

Retail applicants must connect Battle.net and choose a character returned by the authenticated WoW Account Profile API. The browser submits only the selected character ID; the recruitment endpoint checks the encrypted HTTP-only session, confirms that the character is still owned, and reconstructs BattleTag and character fields server-side. Warcraft Forever remains unchanged.

Create a Battle.net Developer Portal web application with this exact local redirect URI:

```text
http://localhost:3000/api/auth/battlenet/callback
```

For production, register the same path on the canonical HTTPS origin, for example:

```text
https://www.example.com/api/auth/battlenet/callback
```

Configure `openid wow.profile` authorization. Add these values to `.env.local`:

```env
BATTLENET_CLIENT_ID=
BATTLENET_CLIENT_SECRET=
BATTLENET_REDIRECT_URI=http://localhost:3000/api/auth/battlenet/callback
BATTLENET_SESSION_SECRET=generate-a-separate-random-value-at-least-32-characters
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

`BATTLENET_CLIENT_ID` and `BATTLENET_CLIENT_SECRET` are optional when the existing `BLIZZARD_CLIENT_ID` and `BLIZZARD_CLIENT_SECRET` belong to the same Developer Portal application and that application can register the redirect URI. Dedicated names take precedence and do not alter the existing guild-roster client-credentials flow.

OAuth state lasts 10 minutes. The recruitment connection lasts at most 30 minutes and never outlives Blizzard's access token. Both are AES-256-GCM encrypted HTTP-only cookies with `SameSite=Lax`; production cookies are also `Secure`. Access tokens are never returned to browser JavaScript or stored in local storage.

Character enrichment uses Raider.IO's character profile endpoint with a five-minute public-data cache. Set `RAIDER_IO_ACCESS_KEY` when using an access key. Raider.IO failures, including rate limiting, leave optional enrichment blank and do not weaken Battle.net ownership verification.

## WoW Audit

Add the current team API key as `WOWAUDIT_API_KEY`. The integration in `lib/wowaudit.ts` calls the current first-party endpoint server-side:

```text
GET https://api.wowaudit.com/v1/team
Authorization: Bearer <key>
```

Responses are validated before use and revalidated every five minutes. The key never reaches client JavaScript. Team data provides the application URL and recurring raid-day fallback, `/v1/characters` supplies the Members roster, and `/v1/raids` supplies Events on both the Events page and homepage.

WoW Audit's current Public API exposes team, roster, raids, wishlists, attendance, and application records, but it does not expose a safe recruitment-needs feed or an applicant-authenticated application-creation endpoint. Application records contain applicant data and are intentionally never requested by this public website. Open roles therefore live in `data/recruitment.ts`; new applications use the site's private Discord webhook integration.

`WOWAUDIT_SPREADSHEET_KEY` remains in the environment contract for legacy spreadsheet-based deployments, but the current v1 team integration does not send it. If WoW Audit publishes a recruitment-needs endpoint later, normalize it to the existing `RecruitmentNeed` model inside `lib/wowaudit.ts`.

If WoW Audit is unavailable or unconfigured, recruitment openings continue to render from local data. The application form only depends on its Discord webhook configuration.

## Twitch

Create a Twitch developer application, then add `TWITCH_CLIENT_ID` and `TWITCH_CLIENT_SECRET` to `.env.local`.

`lib/twitch.ts` uses Twitch's server-side client credentials flow to obtain an app access token. It requests the supported Helix `streams` and `users` endpoints, validates the responses, caches live checks for 60 seconds, and caches profile data for one hour.

If Twitch is unavailable, the Social page still renders. It displays configured streamers without claiming they are live.

## Data architecture

```text
config/guild.ts             Shared guild identity and links
data/raid-progression.ts    Raid tier, instances, bosses, and kills
data/members.ts             Roster and Twitch handles
data/events.ts              Recurring local schedule
data/recruitment.ts         Safe recruitment needs source
data/recruitment-application.ts Application form options and questions
lib/wowaudit.ts             Server-only WoW Audit normalization
lib/raiderio.ts             Server-only Raider.IO raid progression
lib/twitch.ts               Server-only Twitch normalization
types/guild.ts              Internal content and integration models
```

This separation keeps the UI independent of its data source. A future CMS or database can replace a data module without rebuilding the presentational components.

## Legal note

World of Warcraft and related trademarks and assets belong to Blizzard Entertainment. Last Try is an independent guild and is not affiliated with Blizzard Entertainment.
