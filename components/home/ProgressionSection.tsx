"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Check, ChevronDown, Flag, LockKeyhole, Mountain, Shield, Skull, Swords, Target, Trees } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

import { getProgressionTotal } from "@/data/raid-progression";
import type { RaidDifficulty, RaidTier } from "@/types/guild";

type ProgressionGuild = "retail" | "forever";

const foreverRaids = [
  {
    name: "Barrow Deeps",
    size: "10-player raid",
    icon: Mountain,
  },
  {
    name: "Hyjal Summit",
    size: "20-player raid",
    icon: Trees,
  },
] as const;

const formatBestPercent = (percent: number) => new Intl.NumberFormat("en-GB", {
  maximumFractionDigits: 1,
}).format(percent);

const defeatedKey = {
  normal: "normalDefeated",
  heroic: "heroicDefeated",
  mythic: "mythicDefeated",
} as const;

interface ProgressionSectionProps {
  raidTiers: RaidTier[];
  source: "raiderio" | "local";
  profileUrl?: string;
}

export function ProgressionSection({ raidTiers, source, profileUrl }: ProgressionSectionProps) {
  const [tierSlug, setTierSlug] = useState(raidTiers[0].slug);
  const [difficulty, setDifficulty] = useState<RaidDifficulty>("mythic");
  const [progressionGuild, setProgressionGuild] = useState<ProgressionGuild>("retail");
  const reduceMotion = useReducedMotion();
  const selectedTier = raidTiers.find((tier) => tier.slug === tierSlug) ?? raidTiers[0];
  const normal = getProgressionTotal(selectedTier, "normal");
  const heroic = getProgressionTotal(selectedTier, "heroic");
  const mythic = getProgressionTotal(selectedTier, "mythic");
  const isRetail = progressionGuild === "retail";

  return (
    <section id="progression" className="scroll-mt-20 py-18 sm:py-24">
      <div className="section-shell">
        <div className="max-w-3xl">
          <h2 className="display-font text-[2.5rem] leading-[1.02] tracking-[-0.025em] sm:text-[3.5rem]">Raid progression</h2>
          <p className="mt-4 max-w-[38rem] text-[15px] leading-7 text-[var(--muted)]">
            {isRetail ? <>{selectedTier.name}. {source === "raiderio" && profileUrl ? (
              <>Numbers borrowed from <a href={profileUrl} target="_blank" rel="noreferrer" className="font-semibold text-[var(--foreground)] underline decoration-[var(--accent)]/55 underline-offset-4 transition-colors hover:text-[var(--accent-strong)]">Raider.IO</a>.</>
            ) : "Raider.IO is having a moment, so these are our saved numbers."}</> : "Warcraft Forever progression will appear here once our journey begins."}
          </p>
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-2" role="tablist" aria-label="Choose a World of Warcraft guild">
          <button
            id="retail-progression-tab"
            type="button"
            role="tab"
            aria-selected={isRetail}
            aria-controls="progression-track-panel"
            onClick={() => setProgressionGuild("retail")}
            className={`flex min-h-24 cursor-pointer items-start gap-4 rounded-[0.75rem] border p-4 text-left transition-all duration-200 active:translate-y-px ${isRetail ? "border-[var(--accent-strong)] bg-[rgba(198,166,108,0.1)] shadow-[inset_0_1px_0_rgba(240,237,230,0.05)]" : "border-white/10 bg-[#0d1012]/70 hover:border-white/20 hover:bg-[#111518]"}`}
          >
            <span className="grid size-10 shrink-0 place-items-center rounded-[0.5rem] bg-[rgba(198,166,108,0.1)] text-[var(--accent-strong)]"><Swords size={19} strokeWidth={1.7} aria-hidden="true" /></span>
            <span><span className="block font-bold text-[var(--foreground)]">Retail WoW</span><span className="mt-1 block text-xs leading-5 text-[var(--muted)]">Current raid progression and boss kills</span></span>
          </button>
          <button
            id="forever-progression-tab"
            type="button"
            role="tab"
            aria-selected={!isRetail}
            aria-controls="progression-track-panel"
            onClick={() => setProgressionGuild("forever")}
            className={`flex min-h-24 cursor-pointer items-start gap-4 rounded-[0.75rem] border p-4 text-left transition-all duration-200 active:translate-y-px ${!isRetail ? "border-[#79c9c2] bg-[#79c9c2]/10 shadow-[inset_0_1px_0_rgba(174,237,226,0.06)]" : "border-white/10 bg-[#0d1012]/70 hover:border-[#79c9c2]/35 hover:bg-[#0c1716]"}`}
          >
            <span className="grid size-10 shrink-0 place-items-center rounded-[0.5rem] bg-[#79c9c2]/10 text-[#8ee0d6]"><Flag size={19} strokeWidth={1.7} aria-hidden="true" /></span>
            <span><span className="block font-bold text-[#eef9f6]">Warcraft Forever</span><span className="mt-1 block text-xs leading-5 text-[#8da7a2]">Forever progression and milestones</span></span>
          </button>
        </div>

        {isRetail ? (
          <div className="mt-6 grid gap-4 sm:grid-cols-[minmax(0,18rem)_auto] sm:items-end sm:justify-between">
            <div className="w-full">
              <label htmlFor="raid-season" className="mb-2 block text-[10px] font-bold tracking-[0.18em] text-[var(--muted)] uppercase">Season</label>
              <div className="surface relative w-full">
                <select
                  id="raid-season"
                  value={tierSlug}
                  onChange={(event) => setTierSlug(event.target.value)}
                  className="w-full cursor-pointer appearance-none bg-transparent py-3.5 pr-12 pl-5 text-sm font-bold text-[var(--foreground)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-strong)] focus-visible:ring-inset"
                >
                  {raidTiers.map((tier) => (
                    <option key={tier.slug} value={tier.slug} className="bg-[#151515] text-[var(--foreground)]">
                      {tier.expansion} · {tier.season}
                    </option>
                  ))}
                </select>
                <ChevronDown aria-hidden="true" size={17} strokeWidth={2} className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-[var(--accent-strong)]" />
              </div>
            </div>

            <div>
              <p className="mb-2 text-[10px] font-bold tracking-[0.18em] text-[var(--muted)] uppercase">Difficulty</p>
              <div className="surface grid grid-cols-3 p-1" role="group" aria-label="Raid difficulty">
                {(["normal", "heroic", "mythic"] as const).map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setDifficulty(item)}
                    aria-pressed={difficulty === item}
                    className={`relative min-w-20 cursor-pointer rounded-lg px-3 py-3 text-sm font-bold capitalize transition-colors ${difficulty === item ? "text-[#17130d]" : "text-[var(--muted)] hover:text-[var(--foreground)]"}`}
                  >
                    {difficulty === item ? <motion.span layoutId="difficulty" className="absolute inset-0 rounded-lg bg-[var(--accent-strong)]" transition={{ type: "spring", stiffness: 340, damping: 30 }} /> : null}
                    <span className="relative">{item}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        <div id="progression-track-panel" role="tabpanel" aria-labelledby={isRetail ? "retail-progression-tab" : "forever-progression-tab"}>
        {isRetail ? <>
        <div className="mt-8">
          <div className="flex flex-wrap gap-x-10 gap-y-5">
            <div>
              <span className="numeric-font text-4xl font-semibold leading-none tracking-[-0.045em] sm:text-5xl">{normal.defeated} / {normal.total}</span>
              <span className="ml-3 text-xs font-bold tracking-[0.18em] text-[var(--muted)]">NORMAL</span>
            </div>
            <div>
              <span className="numeric-font text-4xl font-semibold leading-none tracking-[-0.045em] sm:text-5xl">{heroic.defeated} / {heroic.total}</span>
              <span className="ml-3 text-xs font-bold tracking-[0.18em] text-[var(--muted)]">HEROIC</span>
            </div>
            <div>
              <span className="numeric-font text-4xl font-semibold leading-none tracking-[-0.045em] text-[var(--accent-strong)] sm:text-5xl">{mythic.defeated} / {mythic.total}</span>
              <span className="ml-3 text-xs font-bold tracking-[0.18em] text-[var(--muted)]">MYTHIC</span>
            </div>
          </div>
        </div>

        <motion.div
          key={selectedTier.slug}
          initial={reduceMotion ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.24 }}
          className="mt-10 space-y-12"
        >
          {selectedTier.instances.map((instance, instanceIndex) => {
            const instanceBosses = [...instance.bosses].sort((a, b) => a.order - b.order);
            const defeatedCount = instanceBosses.filter((boss) => boss[defeatedKey[difficulty]]).length;
            const headingId = `${selectedTier.slug}-raid-instance-${instanceIndex}`;

            return (
              <section key={instance.name} aria-labelledby={headingId}>
                <div className="mb-5 flex items-center gap-3.5 border-b border-white/8 pb-4">
                  <span className="numeric-font grid size-11 shrink-0 place-items-center rounded-lg border border-[var(--accent)]/35 bg-[var(--accent)]/8 text-sm font-semibold text-[var(--accent-strong)]">
                    {String(instanceIndex + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <p className="text-[10px] font-bold tracking-[0.18em] text-[var(--muted)] uppercase">Raid instance</p>
                    <h3 id={headingId} className="display-font mt-1 text-[1.55rem] leading-tight sm:text-[1.8rem]">{instance.name}</h3>
                  </div>
                  <p className="ml-auto text-right text-xs text-[var(--muted)]">
                    <span className="numeric-font block text-lg font-semibold text-[var(--foreground)]">{defeatedCount} / {instanceBosses.length}</span>
                    defeated
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {instanceBosses.map((boss) => {
                    const defeated = boss[defeatedKey[difficulty]];
                    const bossProgress = defeated ? undefined : boss.progress?.[difficulty];

                    return (
                      <motion.article layout key={boss.id} className="surface group overflow-hidden">
                        <div className="relative h-[17rem] w-full overflow-hidden sm:h-auto sm:aspect-[16/10]">
                          <Image
                            src={boss.image}
                            alt={boss.name}
                            fill
                            sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
                            className={`object-cover transition-transform duration-[3500ms] ease-linear group-hover:scale-[1.12] motion-reduce:transition-none motion-reduce:group-hover:scale-100 ${defeated ? "brightness-90 saturate-100" : "grayscale brightness-[0.42] saturate-0"}`}
                          />
                          <div className={`absolute inset-0 transition-colors duration-500 ${defeated ? "bg-gradient-to-t from-[#080a0c] via-[#080a0c]/20 to-transparent" : "bg-gradient-to-t from-[#080a0c] via-[#080a0c]/45 to-[#080a0c]/15"}`} aria-hidden="true" />
                          <AnimatePresence mode="wait">
                            <motion.span
                              key={`${boss.id}-${difficulty}`}
                              initial={reduceMotion ? false : { opacity: 0, scale: 0.86 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0 }}
                              className={`relative z-10 ml-auto mr-3 mt-3 flex h-9 w-fit items-center gap-1.5 rounded-lg border px-2.5 text-[11px] font-bold whitespace-nowrap backdrop-blur-md sm:mr-5 sm:mt-5 sm:h-10 sm:gap-2 sm:px-3 sm:text-xs ${defeated ? "border-[var(--accent)]/60 bg-[#19160f]/82 text-[var(--accent-strong)]" : bossProgress ? "border-[#e58a68]/55 bg-[#1b0d09]/88 text-[#f2a080]" : "border-white/12 bg-[#080a0c]/82 text-[#a1a29d]"}`}
                              title={bossProgress ? `${bossProgress.pullCount} recorded ${bossProgress.pullCount === 1 ? "pull" : "pulls"}` : undefined}
                            >
                              {defeated ? <Check aria-hidden="true" size={17} strokeWidth={2} /> : bossProgress ? <Target aria-hidden="true" size={16} strokeWidth={1.8} /> : <LockKeyhole aria-hidden="true" size={16} strokeWidth={1.8} />}
                              <span>{defeated ? "Defeated" : bossProgress ? `Best ${formatBestPercent(bossProgress.bestPercent)}%` : "Still standing"}</span>
                            </motion.span>
                          </AnimatePresence>
                          <div className="absolute inset-x-0 bottom-0 flex items-end gap-4 p-5 sm:p-6">
                            {boss.icon ? (
                              <div className={`relative size-[4.5rem] shrink-0 overflow-hidden rounded-xl border-2 bg-[#080a0c] p-0.5 shadow-[0_14px_36px_rgba(4,5,7,0.65)] ${defeated ? "border-[var(--accent)]/65" : "border-white/20"}`}>
                                <Image
                                  src={boss.icon}
                                  alt=""
                                  fill
                                  sizes="72px"
                                  className={`rounded-[0.55rem] object-cover ${defeated ? "contrast-110" : "grayscale brightness-90 contrast-125"}`}
                                />
                              </div>
                            ) : null}
                            <div className="min-w-0 pb-0.5">
                              <h4 className="display-font text-balance text-xl font-semibold leading-tight sm:text-2xl">{boss.name}</h4>
                              <p className={`mt-2 flex items-center gap-2 text-xs font-bold ${defeated ? "text-[var(--accent-strong)]" : "text-[#a0a19c]"}`}>
                                {difficulty === "normal" ? (
                                  <Shield aria-hidden="true" size={14} strokeWidth={1.8} />
                                ) : difficulty === "heroic" ? (
                                  <Swords aria-hidden="true" size={14} strokeWidth={1.8} />
                                ) : (
                                  <Skull aria-hidden="true" size={14} strokeWidth={1.8} />
                                )}
                                <span>{difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}</span>
                              </p>
                            </div>
                          </div>
                        </div>
                      </motion.article>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </motion.div>
        </> : (
          <div className="mt-8">
            <div className="mb-5 flex items-end justify-between gap-4 border-b border-[#79c9c2]/15 pb-4">
              <div>
                <p className="text-[10px] font-bold tracking-[0.18em] text-[#79c9c2] uppercase">First raid tier</p>
                <h3 className="display-font mt-1 text-[1.55rem] leading-tight text-[#eef9f6] sm:text-[1.8rem]">The journey begins here</h3>
              </div>
              <span className="rounded-full border border-[#79c9c2]/25 bg-[#79c9c2]/8 px-3 py-1.5 text-[10px] font-bold tracking-[0.14em] text-[#8ee0d6] uppercase">Coming soon</span>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {foreverRaids.map((raid, index) => {
                const RaidIcon = raid.icon;

                return (
                  <article key={raid.name} className="surface relative min-h-52 overflow-hidden border-[#79c9c2]/15 bg-[#0a1212] p-6 sm:p-7">
                    <div className="absolute -right-10 -bottom-12 size-44 rounded-full bg-[#79c9c2]/5 blur-2xl" aria-hidden="true" />
                    <div className="relative flex h-full flex-col">
                      <div className="flex items-start justify-between gap-4">
                        <span className="grid size-11 place-items-center rounded-lg border border-[#79c9c2]/20 bg-[#79c9c2]/8 text-[#8ee0d6]">
                          <RaidIcon size={20} strokeWidth={1.6} aria-hidden="true" />
                        </span>
                        <span className="numeric-font text-sm font-semibold text-[#79c9c2]/65">{String(index + 1).padStart(2, "0")}</span>
                      </div>
                      <div className="mt-auto pt-8">
                        <p className="text-[10px] font-bold tracking-[0.16em] text-[#8da7a2] uppercase">{raid.size}</p>
                        <h4 className="display-font mt-2 text-2xl font-semibold text-[#eef9f6] sm:text-[1.7rem]">{raid.name}</h4>
                        <p className="mt-2 text-sm leading-6 text-[#8da7a2]">Encounter details and progression will appear here once they’re announced.</p>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        )}
        </div>
      </div>
    </section>
  );
}
