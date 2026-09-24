import { BookOpen, MessageCircle, Play, Radio, Shield, Trophy, type LucideIcon } from "lucide-react";
import Link from "next/link";

import { MarksLogo } from "@/components/ui/MarksLogo";
import { guildConfig, guildLinks, type GuildLinkKey } from "@/config/guild";

const labels: Record<GuildLinkKey, string> = {
  discord: "Discord",
  twitch: "Twitch",
  warcraftLogs: "Warcraft Logs",
  raiderIo: "Raider.IO",
  armory: "Armory",
  wowProgress: "WoWProgress",
  youtube: "YouTube",
};

const icons: Record<GuildLinkKey, LucideIcon> = {
  discord: MessageCircle,
  twitch: Radio,
  warcraftLogs: Shield,
  raiderIo: Shield,
  armory: BookOpen,
  wowProgress: Trophy,
  youtube: Play,
};

export function Footer() {
  const socials = (Object.entries(guildLinks) as [GuildLinkKey, string][]).filter(([, href]) => Boolean(href));

  return (
    <footer className="border-t border-white/10 bg-[#090b0d]">
      <div className="section-shell grid gap-9 py-12 md:grid-cols-[1.2fr_0.8fr_1fr] md:py-15">
        <div>
          <Link href="/" className="inline-flex items-center gap-2 text-[var(--foreground)]" aria-label="Last Try home">
            <MarksLogo className="h-10 w-7" sizes="28px" />
            <span className="display-font text-lg tracking-[0.09em]">LAST TRY</span>
          </Link>
          <p className="mt-3 max-w-sm text-[13px] leading-6 text-[var(--muted)]">{guildConfig.tagline}</p>
        </div>
        <div>
          <h2 className="text-sm font-bold text-[var(--foreground)]">Navigate</h2>
          <nav className="mt-3.5 grid grid-cols-2 gap-x-5 gap-y-2.5" aria-label="Footer navigation">
            {guildConfig.navigation.map((item) => (
              <Link key={item.href} href={item.href} className="text-sm text-[var(--muted)] transition-colors hover:text-[var(--accent-strong)]">
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
        <div>
          <h2 className="text-sm font-bold text-[var(--foreground)]">Community</h2>
          {socials.length > 0 ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {socials.map(([key, href]) => {
                const Icon = icons[key];
                return (
                  <a key={key} href={href} target="_blank" rel="noreferrer" className="button-secondary min-h-10 px-3">
                    <Icon size={16} strokeWidth={1.8} /> {labels[key]}
                  </a>
                );
              })}
            </div>
          ) : (
            <p className="mt-4 text-sm leading-6 text-[var(--muted)]">We&apos;ll add the links when somebody remembers.</p>
          )}
        </div>
      </div>
      <div className="section-shell border-t border-white/8 py-6 text-xs leading-5 text-[#777873]">
        World of Warcraft and related trademarks are property of Blizzard Entertainment. Last Try is an independent guild and is not affiliated with Blizzard Entertainment.
      </div>
    </footer>
  );
}
