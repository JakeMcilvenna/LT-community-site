"use client";

import { CircleHelp, Flag, HeartPulse, Info, Search, Shield, SlidersHorizontal, Swords, Users } from "lucide-react";
import { useState } from "react";

import { MemberCard } from "@/components/members/MemberCard";
import type { GuildMember } from "@/types/guild";

const unique = (values: string[]) => [...new Set(values)].sort();

const roleGroups = [
  { role: "Tank" as const, label: "Tanks", icon: Shield },
  { role: "Healer" as const, label: "Healers", icon: HeartPulse },
  { role: "DPS" as const, label: "Damage", icon: Swords },
  { role: null, label: "Unassigned", icon: CircleHelp },
];

type RosterGuild = "retail" | "forever";

export function MemberDirectory({
  retailMembers,
  foreverMembers,
  foreverAvailable,
  defaultGuild,
}: {
  retailMembers: GuildMember[];
  foreverMembers: GuildMember[];
  foreverAvailable: boolean;
  defaultGuild: RosterGuild;
}) {
  const [guild, setGuild] = useState<RosterGuild>(defaultGuild);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("All roles");
  const [className, setClassName] = useState("All classes");
  const [rank, setRank] = useState("All ranks");

  const selectGuild = (nextGuild: RosterGuild) => {
    setGuild(nextGuild);
    setRole("All roles");
    setClassName("All classes");
    setRank("All ranks");

    const url = new URL(window.location.href);
    if (nextGuild === "forever") url.searchParams.set("guild", "forever");
    else url.searchParams.delete("guild");
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
  };

  const members = guild === "retail" ? retailMembers : foreverMembers;
  const isRetail = guild === "retail";
  const classes = unique(members.map((member) => member.className));
  const ranks = unique(members.map((member) => member.rank));
  const roles = unique(members.flatMap((member) => member.role ? [member.role] : []));

  const term = search.trim().toLowerCase();
  const filtered = members.filter((member) =>
    (!term || member.characterName.toLowerCase().includes(term)) &&
    (role === "All roles" || member.role === role) &&
    (className === "All classes" || member.className === className) &&
    (rank === "All ranks" || member.rank === rank),
  );
  const groupedMembers = roleGroups
    .map((group) => ({
      ...group,
      members: filtered.filter((member) => group.role ? member.role === group.role : !member.role),
    }))
    .filter((group) => group.members.length > 0);

  return (
    <div>
      <div className="mb-8 grid gap-3 sm:grid-cols-2" role="tablist" aria-label="Choose a guild roster">
        <button
          id="retail-roster-tab"
          type="button"
          role="tab"
          aria-selected={isRetail}
          aria-controls="guild-roster-panel"
          onClick={() => selectGuild("retail")}
          className={`flex min-h-24 cursor-pointer items-start gap-4 rounded-[0.75rem] border p-4 text-left transition-all duration-200 active:translate-y-px ${isRetail ? "border-[var(--accent-strong)] bg-[rgba(198,166,108,0.1)] shadow-[inset_0_1px_0_rgba(240,237,230,0.05)]" : "border-white/10 bg-[#0d1012]/70 hover:border-white/20 hover:bg-[#111518]"}`}
        >
          <span className="grid size-10 shrink-0 place-items-center rounded-[0.5rem] bg-[rgba(198,166,108,0.1)] text-[var(--accent-strong)]"><Swords size={19} strokeWidth={1.7} aria-hidden="true" /></span>
          <span><span className="block font-bold text-[var(--foreground)]">Retail WoW</span><span className="mt-1 block text-xs leading-5 text-[var(--muted)]">Live roster from WoW Audit</span></span>
        </button>
        <button
          id="forever-roster-tab"
          type="button"
          role="tab"
          aria-selected={!isRetail}
          aria-controls="guild-roster-panel"
          onClick={() => selectGuild("forever")}
          className={`flex min-h-24 cursor-pointer items-start gap-4 rounded-[0.75rem] border p-4 text-left transition-all duration-200 active:translate-y-px ${!isRetail ? "border-[#79c9c2] bg-[#79c9c2]/10 shadow-[inset_0_1px_0_rgba(174,237,226,0.06)]" : "border-white/10 bg-[#0d1012]/70 hover:border-[#79c9c2]/35 hover:bg-[#0c1716]"}`}
        >
          <span className="grid size-10 shrink-0 place-items-center rounded-[0.5rem] bg-[#79c9c2]/10 text-[#8ee0d6]"><Flag size={19} strokeWidth={1.7} aria-hidden="true" /></span>
          <span><span className="block font-bold text-[#eef9f6]">Warcraft Forever</span><span className="mt-1 block text-xs leading-5 text-[#8da7a2]">Live plans from the guild spreadsheet</span></span>
        </button>
      </div>

      <div id="guild-roster-panel" role="tabpanel" aria-labelledby={`${guild}-roster-tab`}>
      {!isRetail ? (
        <div className="mb-5 flex items-start gap-3 rounded-xl border border-[#79c9c2]/25 bg-[#79c9c2]/8 px-4 py-3.5 text-sm text-[#a9c5c0]" role="note">
          <Info className="mt-0.5 shrink-0 text-[#8ee0d6]" size={17} strokeWidth={1.8} aria-hidden="true" />
          <p className="leading-6">
            <strong className="text-[#eef9f6]">This is an in-progress planning roster, not the final lineup.</strong>{" "}
            Classes, specs, and members are likely to change heavily before launch.
          </p>
        </div>
      ) : null}
      {members.length === 0 ? (
        <div className="surface flex min-h-72 flex-col items-center justify-center px-6 text-center">
          <h2 className="display-font text-2xl font-semibold">{!isRetail && !foreverAvailable ? "Roster temporarily unavailable" : "Roster coming soon"}</h2>
          <p className="mt-3 text-sm text-[var(--muted)]">
            {!isRetail && !foreverAvailable ? "The live spreadsheet could not be loaded. Please try again shortly." : "We’re putting the roster together. Check back soon."}
          </p>
        </div>
      ) : <>
      <div className="surface grid gap-2.5 p-3.5 md:grid-cols-[1.35fr_repeat(3,0.72fr)]">
        <label className="relative">
          <span className="sr-only">Search character names</span>
          <Search aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-[#777974]" size={17} strokeWidth={1.8} />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search character names"
            className="h-12 w-full rounded-lg border border-white/12 bg-[#090b0d] pl-10 pr-4 text-sm text-[var(--foreground)] placeholder:text-[#73746f] transition-colors focus:border-[var(--accent-strong)] focus:outline-none"
          />
        </label>
        {[
          { label: "Filter by role", value: role, setValue: setRole, options: ["All roles", ...roles] },
          { label: "Filter by class", value: className, setValue: setClassName, options: ["All classes", ...classes] },
          { label: "Filter by guild rank", value: rank, setValue: setRank, options: ["All ranks", ...ranks] },
        ].map((filter) => (
          <label key={filter.label} className="relative">
            <span className="sr-only">{filter.label}</span>
            <SlidersHorizontal aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#777974]" size={15} strokeWidth={1.8} />
            <select value={filter.value} onChange={(event) => filter.setValue(event.target.value)} className="h-12 w-full appearance-none rounded-lg border border-white/12 bg-[#090b0d] pl-9 pr-4 text-sm text-[var(--foreground)] transition-colors focus:border-[var(--accent-strong)] focus:outline-none">
              {filter.options.map((option) => <option key={option}>{option}</option>)}
            </select>
          </label>
        ))}
      </div>

      <p className="mt-6 text-sm text-[var(--muted)]" aria-live="polite">Showing {filtered.length} of {members.length} characters</p>

      {filtered.length > 0 ? (
        <div className="mt-7 space-y-10">
          {groupedMembers.map((group) => {
            const GroupIcon = group.icon;

            return (
              <section key={group.label} aria-labelledby={`member-group-${group.label.toLowerCase()}`}>
                <div className="mb-4 flex items-center gap-3 border-b border-white/8 pb-3.5">
                  <span className="grid size-9 place-items-center rounded-lg border border-white/10 bg-white/4 text-[var(--accent-strong)]">
                    <GroupIcon aria-hidden="true" size={17} strokeWidth={1.8} />
                  </span>
                  <h2 id={`member-group-${group.label.toLowerCase()}`} className="display-font text-[1.45rem] leading-tight">
                    {group.label}
                  </h2>
                  <span className="numeric-font rounded-full border border-white/10 px-2.5 py-1 text-xs font-bold text-[var(--muted)]">
                    {group.members.length}
                  </span>
                </div>
                <div className="grid gap-3.5 md:grid-cols-2 xl:grid-cols-3">
                  {group.members.map((member) => <MemberCard key={member.id} member={member} />)}
                </div>
              </section>
            );
          })}
        </div>
      ) : (
        <div className="surface mt-6 flex min-h-64 flex-col items-center justify-center px-6 text-center">
          <Users aria-hidden="true" className="text-[var(--accent-strong)]" size={28} strokeWidth={1.5} />
          <h2 className="display-font mt-4 text-2xl font-semibold">No matching members</h2>
          <p className="mt-2 text-sm text-[var(--muted)]">Try another search, or ease up on the filters.</p>
        </div>
      )}
      </>}
      </div>
    </div>
  );
}
