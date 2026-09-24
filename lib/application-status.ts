import "server-only";

import { list, put } from "@vercel/blob";

const DISCORD_SNOWFLAKE_PATTERN = /^\d{17,20}$/;
const APPLICATION_STATUS_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const STATUS_PREFIX = "recruitment/application-status";

export const isApplicationStatusId = (value: string) =>
  APPLICATION_STATUS_ID_PATTERN.test(value);

export const isDiscordChannelId = (value: string) =>
  DISCORD_SNOWFLAKE_PATTERN.test(value);

export async function recordApplicationChannel(
  applicationStatusId: string,
  channelId: string,
) {
  if (!isApplicationStatusId(applicationStatusId) || !isDiscordChannelId(channelId)) {
    throw new Error("Invalid application channel status.");
  }

  await put(
    `${STATUS_PREFIX}/${applicationStatusId}/${channelId}.json`,
    "{}",
    {
      access: "public",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: "application/json",
    },
  );
}

export async function findApplicationChannel(applicationStatusId: string) {
  if (!isApplicationStatusId(applicationStatusId)) return null;

  const { blobs } = await list({
    prefix: `${STATUS_PREFIX}/${applicationStatusId}/`,
    limit: 1,
  });
  const channelId = blobs[0]?.pathname.split("/").at(-1)?.replace(/\.json$/, "");
  return channelId && isDiscordChannelId(channelId) ? channelId : null;
}
