import type { RecruitmentNeed, RecruitmentPriority } from "@/types/guild";

const priorityOrder: Record<RecruitmentPriority, number> = {
  High: 0,
  Medium: 1,
  Low: 2,
  Closed: 3,
};

export const getOpenRecruitmentNeeds = (needs: RecruitmentNeed[]) =>
  needs
    .filter((need) => need.priority !== "Closed")
    .sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
