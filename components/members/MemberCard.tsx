"use client";

import { BarChart3, HeartPulse, ScrollText, Shield, Swords } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

import { guildConfig } from "@/config/guild";
import { getClassColor, getClassIconPath } from "@/lib/warcraft";
import type { GuildMember } from "@/types/guild";

const roleIcons = { Tank: Shield, Healer: HeartPulse, DPS: Swords } as const;

export function MemberCard({ member }: { member: GuildMember }) {
  const [iconFailed, setIconFailed] = useState(false);
  const RoleIcon = member.role ? roleIcons[member.role] : Swords;
  const classColor = getClassColor(member.className);
  const classIconUrl = getClassIconPath(member.className);
  const initials = member.characterName.slice(0, 2).toUpperCase();
  const region = guildConfig.region.toLowerCase();
  const realm = (member.realm || guildConfig.realm).toLowerCase();
  const character = member.characterName.toLowerCase();
  const encodedRealm = encodeURIComponent(realm);
  const encodedCharacter = encodeURIComponent(character);
  const shouldShowRank = member.guildRankIndex === undefined || member.guildRankIndex <= 1;
  const profileLinks = member.showCharacterProfiles === false ? [] : [
    {
      label: "Warcraft Logs",
      href: `https://www.warcraftlogs.com/character/${region}/${encodedRealm}/${encodedCharacter}`,
      icon: ScrollText,
    },
    {
      label: "Raider.IO",
      href: `https://raider.io/characters/${region}/${encodedRealm}/${encodedCharacter}`,
      icon: BarChart3,
    },
    {
      label: "Armory",
      href: `https://worldofwarcraft.blizzard.com/en-gb/character/${region}/${encodedRealm}/${encodedCharacter}`,
      icon: Shield,
    },
  ];

  return (
    <article className="surface relative overflow-hidden p-4.5 pl-5.5">
      <div className="absolute inset-y-0 left-0 w-1 opacity-90" style={{ backgroundColor: classColor }} aria-hidden="true" />
      <div className="flex items-start gap-4">
        <div className="display-font relative grid size-14 shrink-0 place-items-center overflow-hidden rounded-xl border bg-[#0a0c0e] text-sm font-bold" style={{ borderColor: `${classColor}80`, color: classColor }} aria-hidden="true">
          {classIconUrl && !iconFailed ? (
            <Image
              src={classIconUrl}
              alt=""
              width={56}
              height={56}
              className="size-full object-cover"
              onError={() => setIconFailed(true)}
            />
          ) : initials}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="display-font truncate text-[1.2rem] leading-tight">{member.characterName}</h2>
              <p className="mt-1 text-sm font-semibold" style={{ color: classColor }}>
                {member.className}{member.specialization ? ` · ${member.specialization}` : ""}
              </p>
              {member.realm ? <p className="mt-1 text-xs text-[#858681]">{member.realm}</p> : null}
            </div>
            {shouldShowRank ? <span className="rounded-lg border border-white/10 px-2.5 py-1.5 text-[11px] font-bold text-[#aaa8a2]">{member.rank}</span> : null}
          </div>
          <div className="mt-4 flex items-center justify-between gap-3 border-t border-white/8 pt-3.5 text-xs text-[var(--muted)]">
            <div className="flex flex-wrap gap-1.5" aria-label={`${member.characterName}'s character profiles`}>
            {profileLinks.map(({ label, href, icon: Icon }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noreferrer"
                className="inline-flex size-7 items-center justify-center rounded-md border border-white/10 text-[#b8b6b0] transition-colors hover:border-[var(--accent)]/55 hover:text-[var(--accent-strong)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-strong)] focus:ring-offset-2 focus:ring-offset-[#0a0c0e]"
                aria-label={`Open ${member.characterName}'s ${label} profile`}
                title={label}
              >
                <Icon aria-hidden="true" size={13} strokeWidth={1.8} />
              </a>
            ))}
            </div>
            {member.role ? <span className="flex shrink-0 items-center gap-1.5"><RoleIcon aria-hidden="true" size={14} strokeWidth={1.8} /> {member.role}</span> : null}
          </div>
        </div>
      </div>
    </article>
  );
}
