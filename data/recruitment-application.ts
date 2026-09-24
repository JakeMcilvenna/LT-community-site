export const wowClasses = [
  "Death Knight",
  "Demon Hunter",
  "Druid",
  "Evoker",
  "Hunter",
  "Mage",
  "Monk",
  "Paladin",
  "Priest",
  "Rogue",
  "Shaman",
  "Warlock",
  "Warrior",
] as const;

export type WowClass = (typeof wowClasses)[number];

export const raidNights = [
  "Wednesday / 19:30 - 22:30",
  "Sunday / 19:30 - 22:30",
] as const;

export const englishLevels = ["Basic", "Intermediate", "Fluent"] as const;
export const microphoneOptions = ["Yes", "No"] as const;

export const foreverFaction = "Alliance" as const;

export const foreverRoles = ["Tank", "Healer", "Melee damage", "Ranged damage", "Flexible"] as const;

export const foreverGoals = [
  "Leveling and exploration",
  "Dungeons",
  "Raiding",
  "PvP",
  "Professions and economy",
  "Social and community",
] as const;

export const foreverExperienceLevels = [
  "New to World of Warcraft",
  "Returning player",
  "Current Retail player",
  "Current Classic player",
  "I play several versions",
] as const;

export const recruitmentQuestions = [
  {
    name: "joinReason",
    label: "Why do you want to join our guild?",
    required: true,
  },
  {
    name: "guildOffer",
    label: "What can you offer the guild?",
    required: true,
  },
  {
    name: "previousGuilds",
    label: "Previous guilds and reasons for leaving",
    required: true,
  },
  {
    name: "raidExperience",
    label: "What kind of raiding experience do you have?",
    required: true,
  },
  {
    name: "computerDetails",
    label: "Give us some details about the computer you are using",
    required: true,
  },
  {
    name: "connectionDetails",
    label: "What is your connection speed, and how reliable is it?",
    required: true,
  },
] as const;

export type RecruitmentQuestionName = (typeof recruitmentQuestions)[number]["name"];
