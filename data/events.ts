import type { GuildEvent, GuildEventTemplate } from "@/types/guild";

export const featuredEvents: GuildEvent[] = [
  {
    id: "warcraft-forever-launch",
    title: "World of Warcraft: Forever Launch",
    date: "2026-11-04",
    startTime: "23:00",
    endTime: "00:00",
    startAt: "2026-11-04T23:00:00.000Z",
    endAt: "2026-11-05T00:00:00.000Z",
    description: "World of Warcraft: Forever launches globally at 23:00 guild time.",
    type: "Guild Event",
    team: "forever",
    location: "Azeroth",
    status: "Launch",
    source: "local",
  },
];

// weekday uses 0 for Sunday through 6 for Saturday.
export const eventTemplates: GuildEventTemplate[] = [
  {
    id: "progression-thursday",
    title: "Mythic Progression",
    weekday: 4,
    startTime: "20:00",
    endTime: "23:00",
    description: "Main raid night. Invites go out fifteen minutes early, pulls start at 20:00.",
    type: "Progression",
    location: "Midnight: Season 1",
    recurringLabel: "Every Thursday",
  },
  {
    id: "progression-sunday",
    title: "Mythic Progression",
    weekday: 0,
    startTime: "20:00",
    endTime: "23:00",
    description: "Same bosses, slightly fewer excuses. Our second main raid night.",
    type: "Progression",
    location: "Midnight: Season 1",
    recurringLabel: "Every Sunday",
  },
  {
    id: "heroic-tuesday",
    title: "Heroic Clear",
    weekday: 2,
    startTime: "20:00",
    endTime: "22:30",
    description: "Optional heroic for vault slots, alts, trials, and anyone avoiding an early night.",
    type: "Optional Raid",
    location: "Midnight: Season 1",
    recurringLabel: "Every Tuesday",
  },
];
