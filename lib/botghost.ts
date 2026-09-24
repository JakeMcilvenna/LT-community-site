import "server-only";

import type { BotGhostWebhookVariable } from "@/lib/botghost-values";

const BOTGHOST_TIMEOUT_MS = 12_000;

type BotGhostWebhookPayload = {
  variables: BotGhostWebhookVariable[];
};

const getRequiredEnvironmentValue = (name: string) => {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
};

export async function sendBotGhostApplication(payload: BotGhostWebhookPayload) {
  const webhookUrl = new URL(getRequiredEnvironmentValue("BOTGHOST_APPLICATION_WEBHOOK_URL"));
  if (webhookUrl.protocol !== "https:") {
    throw new Error("The BotGhost application webhook URL must use HTTPS.");
  }

  if (process.env.NODE_ENV === "development") {
    console.info(
      "[BotGhost] Outgoing application variables",
      payload.variables.map(({ name, variable, value }) => ({ name, variable, value })),
    );
  }

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: {
      Authorization: getRequiredEnvironmentValue("BOTGHOST_WEBHOOK_API_KEY"),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    cache: "no-store",
    signal: AbortSignal.timeout(BOTGHOST_TIMEOUT_MS),
  });

  if (process.env.NODE_ENV === "development") {
    console.info("[BotGhost] Application webhook response status", response.status);
  }

  if (!response.ok) {
    throw new Error("The BotGhost application webhook returned a non-success response.");
  }
}
