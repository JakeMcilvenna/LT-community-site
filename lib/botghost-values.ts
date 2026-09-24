export type BotGhostWebhookVariable = {
  name: string;
  variable: `{event_${string}}`;
  value: string;
};

const UNSAFE_CONTROL_CHARACTERS = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f]/g;

export function formatBotGhostValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "Not provided";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) {
    const items = value
      .filter((item): item is string | number | boolean =>
        typeof item === "string" || typeof item === "number" || typeof item === "boolean",
      )
      .map((item) => formatBotGhostValue(item))
      .filter((item) => item !== "Not provided");
    return items.length > 0 ? items.join(", ") : "Not provided";
  }
  if (typeof value === "number") return String(value);
  if (typeof value !== "string") return "Not provided";

  const cleaned = value
    .replace(/\r\n?/g, "\n")
    .replace(UNSAFE_CONTROL_CHARACTERS, "")
    .replace(/[ \t]+$/gm, "")
    .trim();
  return cleaned || "Not provided";
}

export function createBotGhostVariable(
  name: string,
  value: unknown,
): BotGhostWebhookVariable {
  return {
    name,
    variable: `{event_${name}}`,
    value: formatBotGhostValue(value),
  };
}
