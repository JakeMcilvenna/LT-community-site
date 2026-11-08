// Forever requires two names, each 2–12 letters, with no triple repeated letter.
// https://news.blizzard.com/en-us/article/24304161/create-a-name-of-your-own-in-wow-forever
// https://www.method.gg/wow-forever/choosing-your-character-name-and-ruleset-in-wow-forever
export const FOREVER_CHARACTER_NAME_PATTERN = String.raw`(?!.*(\p{L})\1\1)\p{L}{2,12} \p{L}{2,12}`;

export const FOREVER_CHARACTER_NAME_HINT =
  "First name and surname, 2–12 letters each, separated by one space. Accents are allowed; numbers, punctuation, and three identical letters in a row are not.";

const foreverCharacterNameRegex = new RegExp(
  String.raw`^(?:${FOREVER_CHARACTER_NAME_PATTERN})(?![\s\S])`,
  "iu",
);

export const isValidForeverCharacterName = (value: string) =>
  foreverCharacterNameRegex.test(value);

export const isWarcraftLogsUrl = (value: string) => {
  try {
    const hostname = new URL(value).hostname.toLowerCase();
    return hostname === "warcraftlogs.com" || hostname.endsWith(".warcraftlogs.com");
  } catch {
    return false;
  }
};
