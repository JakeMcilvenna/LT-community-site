export type GuildRole = "Tank" | "Healer" | "DPS";

export type RecruitmentPriority = "High" | "Medium" | "Low" | "Closed";

export type RaidDifficulty = "normal" | "heroic" | "mythic";

export interface RaidBossProgress {
  bestPercent: number;
  pullCount: number;
  lastPullAt?: string;
}

export interface RaidBoss {
  id: string;
  raiderIoSlug?: string;
  name: string;
  image: string;
  icon?: string;
  order: number;
  instance: string;
  normalDefeated: boolean;
  heroicDefeated: boolean;
  mythicDefeated: boolean;
  progress?: Partial<Record<RaidDifficulty, RaidBossProgress>>;
}

export interface RaidInstance {
  name: string;
  raiderIoSlug?: string;
  bosses: RaidBoss[];
}

export interface RaidTier {
  name: string;
  slug: string;
  expansion: string;
  season: string;
  artwork?: string;
  instances: RaidInstance[];
}

export interface GuildMember {
  id: string;
  characterName: string;
  rank: string;
  guildRankIndex?: number;
  className: string;
  realm?: string;
  specialization?: string;
  role?: GuildRole;
  status?: string;
  avatar?: string;
  twitchUsername?: string;
  showCharacterProfiles?: boolean;
}

export interface RecruitmentNeed {
  id: string;
  className: string;
  specialization?: string;
  role?: GuildRole;
  priority: RecruitmentPriority;
  status?: string;
  notes?: string;
}

export type GuildEventType = "Progression" | "Optional Raid" | "Guild Event" | "Other";

export interface GuildEventTemplate {
  id: string;
  title: string;
  weekday: number;
  startTime: string;
  endTime: string;
  description: string;
  type: GuildEventType;
  location?: string;
  recurringLabel?: string;
}

export interface GuildEvent extends Omit<GuildEventTemplate, "weekday"> {
  date: string;
  startAt: string;
  endAt: string;
  team?: "retail" | "forever";
  status?: string;
  signupLabel?: string;
  signupUrl?: string;
  source?: "wowaudit" | "raid-helper" | "local";
}

export interface LiveStream {
  id: string;
  username: string;
  memberName: string;
  title: string;
  gameName: string;
  viewerCount: number;
  thumbnailUrl: string;
  profileImageUrl?: string;
  url: string;
  isLive: true;
}

export interface OfflineStreamer {
  username: string;
  memberName: string;
  profileImageUrl?: string;
  url: string;
}
