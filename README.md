# LT community

A website for the LT gaming community, built with Next.js, TypeScript, and Tailwind CSS.

## Run locally

Requires Node.js 20.9 or newer.

```bash
npm install
copy .env.example .env.local
npm run dev
```

Open `http://localhost:3000`.

## Discord application sign-in

Direct website applications use Discord OAuth before submission. Create a Discord
application with a bot, add that bot to the Last Try server, and register this local
OAuth redirect in the Discord Developer Portal:

```text
http://localhost:3000/api/auth/discord/callback
```

Set `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, `DISCORD_BOT_TOKEN`, and
`DISCORD_REDIRECT_URI` in `.env.local`. The client ID, secret, and bot token must
all belong to the same Discord application. Production must register and use the
equivalent HTTPS callback on the live site.

The submit button requests Discord's `identify` and `guilds.join` scopes. After the
user authorizes, the website adds them to `DISCORD_GUILD_ID`, verifies their user
ID, and submits the application to the existing BotGhost workflow.

Quality checks:

```bash
npm run typecheck
npm run lint
npm run build
```
