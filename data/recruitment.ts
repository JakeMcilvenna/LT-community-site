import type { RecruitmentNeed } from "@/types/guild";

// These needs are the safe local source of truth because WoW Audit's current
// public API does not expose a recruitment-needs endpoint.
export const localRecruitmentNeeds: RecruitmentNeed[] = [
  {
    id: "all-dps",
    className: "All classes",
    specialization: "All DPS specs",
    role: "DPS",
    priority: "High",
    status: "All damage specs considered.",
  },
  {
    id: "all-healers",
    className: "All classes",
    specialization: "All healing specs",
    role: "Healer",
    priority: "High",
    status: "All healing specs considered.",
  },
];
