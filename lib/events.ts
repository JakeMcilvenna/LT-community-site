import { guildConfig } from "@/config/guild";
import { eventTemplates, featuredEvents } from "@/data/events";
import { getRaidHelperEventData, type RaidHelperEvent } from "@/lib/raid-helper";
import { getWowauditRaidData, getWowauditTeam, type WowauditRaid, type WowauditTeam } from "@/lib/wowaudit";
import type { GuildEvent } from "@/types/guild";

const getDateParts = (date: Date, timeZone: string) => {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  }).formatToParts(date);

  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";

  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return {
    year: Number(value("year")),
    month: Number(value("month")),
    day: Number(value("day")),
    weekday: weekdays.indexOf(value("weekday")),
  };
};

const zonedTimeToUtc = (date: string, time: string, timeZone: string) => {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  const initial = new Date(Date.UTC(year, month - 1, day, hour, minute));
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(initial);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? 0);
  const represented = Date.UTC(value("year"), value("month") - 1, value("day"), value("hour"), value("minute"));
  return new Date(initial.getTime() - (represented - initial.getTime()));
};

const buildLocalEvents = (limit: number, now: Date, includeExpired = false): GuildEvent[] => {
  const today = getDateParts(now, guildConfig.timezone);
  const calendarStart = new Date(Date.UTC(today.year, today.month - 1, today.day));
  const events: GuildEvent[] = [];

  for (let offset = includeExpired ? -31 : 0; offset < 120; offset += 1) {
    const candidate = new Date(calendarStart);
    candidate.setUTCDate(calendarStart.getUTCDate() + offset);
    const weekday = candidate.getUTCDay();
    const date = candidate.toISOString().slice(0, 10);

    for (const template of eventTemplates.filter((event) => event.weekday === weekday)) {
      const start = zonedTimeToUtc(date, template.startTime, guildConfig.timezone);
      const end = zonedTimeToUtc(date, template.endTime, guildConfig.timezone);
      if (!includeExpired && start <= now) continue;
      events.push({
        id: template.id,
        title: template.title,
        startTime: template.startTime,
        endTime: template.endTime,
        description: template.description,
        type: template.type,
        location: template.location,
        recurringLabel: template.recurringLabel,
        source: "local",
        date,
        startAt: start.toISOString(),
        endAt: end.toISOString(),
      });
    }
  }

  return events.sort((a, b) => a.startAt.localeCompare(b.startAt)).slice(0, limit);
};

const toRaidEvent = (raid: WowauditRaid): GuildEvent => {
  const start = zonedTimeToUtc(raid.date, raid.start_time, guildConfig.timezone);
  let end = zonedTimeToUtc(raid.date, raid.end_time, guildConfig.timezone);
  if (end <= start) end = new Date(end.getTime() + 86_400_000);
  const location = raid.instance || raid.instances.join(", ") || undefined;
  const signupLabel = raid.present_size != null && raid.total_size != null
    ? `${raid.present_size} of ${raid.total_size} marked present`
    : undefined;

  return {
    id: `wowaudit-raid-${raid.id}`,
    title: raid.title,
    startTime: raid.start_time,
    endTime: raid.end_time,
    description: `${raid.difficulty ? `${raid.difficulty} ` : ""}${raid.optional ? "optional raid" : "raid"} scheduled through WoW Audit.`,
    type: raid.optional ? "Optional Raid" : "Progression",
    location,
    date: raid.date,
    startAt: start.toISOString(),
    endAt: end.toISOString(),
    status: raid.status || undefined,
    signupLabel,
    source: "wowaudit",
  };
};

const toRaidHelperEvent = (event: RaidHelperEvent): GuildEvent => {
  const start = new Date(event.startAt);
  const end = event.endAt ? new Date(event.endAt) : new Date(start.getTime() + 3 * 60 * 60 * 1_000);
  return {
    id: `raid-helper-${event.id}`,
    title: event.title,
    startTime: formatEventTime(event.startAt),
    endTime: formatEventTime(end.toISOString()),
    description: event.description || "Event scheduled through Raid-Helper.",
    type: "Guild Event",
    date: event.startAt.slice(0, 10),
    startAt: event.startAt,
    endAt: end.toISOString(),
    status: event.status,
    signupLabel: event.signupLabel,
    signupUrl: event.signupUrl,
    source: "raid-helper",
  };
};

const weekdayIndexes: Record<string, number> = {
  Sunday: 0,
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
};

const buildTeamScheduleEvents = (team: WowauditTeam, limit: number, now: Date, includeExpired = false): GuildEvent[] => {
  const today = getDateParts(now, guildConfig.timezone);
  const calendarStart = new Date(Date.UTC(today.year, today.month - 1, today.day));
  const events: GuildEvent[] = [];

  for (let offset = includeExpired ? -31 : 0; offset < 120; offset += 1) {
    const candidate = new Date(calendarStart);
    candidate.setUTCDate(calendarStart.getUTCDate() + offset);
    const date = candidate.toISOString().slice(0, 10);

    for (const raidDay of team.raid_days) {
      if (weekdayIndexes[raidDay.week_day] !== candidate.getUTCDay()) continue;
      if (raidDay.active_from && date < raidDay.active_from) continue;
      if (raidDay.active_until && date > raidDay.active_until) continue;

      const start = zonedTimeToUtc(date, raidDay.start_time, guildConfig.timezone);
      let end = zonedTimeToUtc(date, raidDay.end_time, guildConfig.timezone);
      if (end <= start) end = new Date(end.getTime() + 86_400_000);
      if (!includeExpired && start <= now) continue;
      const title = raidDay.title || raidDay.current_instance || `${raidDay.difficulty || "Guild"} raid`;

      events.push({
        id: `wowaudit-raid-day-${raidDay.week_day.toLowerCase()}`,
        title,
        startTime: raidDay.start_time,
        endTime: raidDay.end_time,
        description: `${raidDay.difficulty ? `${raidDay.difficulty} ` : ""}${raidDay.optional ? "optional raid" : "raid"} from the WoW Audit team schedule.`,
        type: raidDay.optional ? "Optional Raid" : "Progression",
        location: raidDay.current_instance || undefined,
        recurringLabel: `Every ${raidDay.week_day}`,
        date,
        startAt: start.toISOString(),
        endAt: end.toISOString(),
        status: "Scheduled",
        source: "wowaudit",
      });
    }
  }

  return events.sort((a, b) => a.startAt.localeCompare(b.startAt)).slice(0, limit);
};

export interface UpcomingEventData {
  events: GuildEvent[];
  source: "raid-helper" | "wowaudit-raids" | "wowaudit-schedule" | "local";
  integrationStatus: "connected" | "unconfigured" | "unavailable";
}

const withFeaturedEvents = (
  events: GuildEvent[],
  limit: number,
  now: Date,
  includeExpired: boolean,
) => {
  const expiryCutoff = new Date(now.getTime() - 31 * 86_400_000);
  const featured = featuredEvents.filter((event) =>
    new Date(event.startAt) > now || (includeExpired && new Date(event.endAt) >= expiryCutoff));

  return [...events, ...featured]
    .sort((a, b) => a.startAt.localeCompare(b.startAt))
    .slice(0, limit);
};

export const getUpcomingEventData = async (limit = 6, now = new Date(), includeExpired = false): Promise<UpcomingEventData> => {
  const expiryCutoff = new Date(now.getTime() - 31 * 86_400_000);
  const shouldInclude = (event: GuildEvent) =>
    new Date(event.startAt) > now || (includeExpired && new Date(event.endAt) >= expiryCutoff);
  const provider = process.env.EVENT_PROVIDER?.trim().toLowerCase() || "wowaudit";
  if (provider === "raid-helper") {
    const raidHelperData = await getRaidHelperEventData();
    if (raidHelperData.integrationStatus === "connected") {
      const events = raidHelperData.events
        .map(toRaidHelperEvent)
        .filter(shouldInclude)
        .slice(0, limit);
      const mergedEvents = withFeaturedEvents(events, limit, now, includeExpired);
      return { events: mergedEvents, source: "raid-helper", integrationStatus: "connected" };
    }
  }

  const raidData = await getWowauditRaidData();

  if (raidData.integrationStatus === "connected") {
    const events = raidData.raids
      .map(toRaidEvent)
      .filter(shouldInclude)
      .sort((a, b) => a.startAt.localeCompare(b.startAt))
      .slice(0, limit);

    return {
      events: withFeaturedEvents(events, limit, now, includeExpired),
      source: "wowaudit-raids",
      integrationStatus: "connected",
    };
  }

  const team = await getWowauditTeam();
  if (team?.raid_days.length) {
    return {
      events: withFeaturedEvents(
        buildTeamScheduleEvents(team, limit, now, includeExpired),
        limit,
        now,
        includeExpired,
      ),
      source: "wowaudit-schedule",
      integrationStatus: "connected",
    };
  }

  return {
    events: withFeaturedEvents(buildLocalEvents(limit, now, includeExpired), limit, now, includeExpired),
    source: "local",
    integrationStatus: raidData.integrationStatus,
  };
};

export const formatEventDate = (iso: string) =>
  new Intl.DateTimeFormat("en-GB", {
    timeZone: guildConfig.timezone,
    weekday: "short",
    day: "2-digit",
    month: "short",
  }).format(new Date(iso));

export const formatEventTime = (iso: string) =>
  new Intl.DateTimeFormat("en-GB", {
    timeZone: guildConfig.timezone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(iso));

/** An event remains available until its scheduled end time has passed. */
export const isEventExpired = (event: Pick<GuildEvent, "endAt">, now = Date.now()) => {
  const endTime = new Date(event.endAt).getTime();
  return Number.isFinite(endTime) && endTime <= now;
};
