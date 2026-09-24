import Image from "next/image";
import { HeartPulse, Shield, Swords } from "lucide-react";

import { getClassColor, getClassIconPath } from "@/lib/warcraft";
import type { RecruitmentNeed, RecruitmentPriority } from "@/types/guild";

const roleIcons = { Tank: Shield, Healer: HeartPulse, DPS: Swords } as const;

// These stay deliberately muted, giving roles a clear distinction without the
// bright, game-default red/green/blue treatment.
const roleAccents = {
  DPS: "#c6a66c",
  Healer: "#8ca4c4",
  Tank: "#8ca4ae",
} as const;

const priorityStyles: Record<RecruitmentPriority, string> = {
  High: "border-[#d97972]/45 bg-[#d97972]/10 text-[#efa39d]",
  Medium: "border-[#d8ae5f]/40 bg-[#d8ae5f]/9 text-[#e4c176]",
  Low: "border-[#70ad82]/40 bg-[#70ad82]/9 text-[#9bc9a8]",
  Closed: "border-white/10 bg-white/[0.025] text-[#858681]",
};

export function RecruitmentCard({ need }: { need: RecruitmentNeed }) {
  const RoleIcon = need.role ? roleIcons[need.role] : Swords;
  const classColor = getClassColor(need.className);
  const roleColor = need.role ? roleAccents[need.role] : classColor;
  const accentColor = need.className === "All classes" || need.className === "Any" ? roleColor : classColor;
  const isClassSpecific = need.className !== "All classes" && need.className !== "Any";
  const classIconUrl = isClassSpecific ? getClassIconPath(need.className) : undefined;
  const openingName = need.specialization ?? (need.className === "Any" ? "Flexible opening" : "Any spec");
  const recruitmentScope = need.status ?? (
    need.className === "Any"
      ? "Any class considered"
      : need.specialization
        ? "Preferred spec"
        : "Any spec considered"
  );

  return (
    <article
      className="surface relative overflow-hidden p-4.5 pl-5.5"
      style={{ background: `linear-gradient(105deg, ${accentColor}0c, transparent 36%), rgba(15, 18, 21, 0.84)` }}
    >
      <div className="absolute inset-y-0 left-0 w-1 opacity-90" style={{ backgroundColor: accentColor }} aria-hidden="true" />
      <div className="flex items-start gap-4">
        <div
          className="display-font grid size-14 shrink-0 place-items-center overflow-hidden rounded-xl border bg-[#0a0c0e] text-sm font-bold"
          style={{ borderColor: `${accentColor}80`, color: accentColor }}
          aria-hidden="true"
        >
          {classIconUrl ? (
            <Image
              src={classIconUrl}
              alt=""
              width={56}
              height={56}
              className="size-full object-cover"
            />
          ) : (
            <RoleIcon size={22} strokeWidth={1.8} />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="display-font truncate text-[1.2rem] leading-tight">{openingName}</h2>
              <p className="mt-1 text-sm font-semibold" style={{ color: accentColor }}>{need.className}</p>
              <p className="mt-1 text-xs text-[#858681]">{recruitmentScope}</p>
            </div>
            <span className={`shrink-0 rounded-lg border px-2.5 py-1.5 text-[11px] font-bold ${priorityStyles[need.priority]}`}>
              {need.priority}
            </span>
          </div>
          <div className="mt-4 flex items-center justify-end border-t border-white/8 pt-3.5 text-xs" style={{ color: need.role ? accentColor : "var(--muted)" }}>
            {need.role ? (
              <span className="flex shrink-0 items-center gap-1.5">
                <RoleIcon aria-hidden="true" size={14} strokeWidth={1.8} /> {need.role}
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}
