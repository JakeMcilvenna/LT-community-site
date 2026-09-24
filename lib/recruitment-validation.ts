export const isWarcraftLogsUrl = (value: string) => {
  try {
    const hostname = new URL(value).hostname.toLowerCase();
    return hostname === "warcraftlogs.com" || hostname.endsWith(".warcraftlogs.com");
  } catch {
    return false;
  }
};
