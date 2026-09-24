import type { Metadata } from "next";
import { BookOpen, MessageCircle, Play, Radio, Shield, Trophy, type LucideIcon } from "lucide-react";

import { LiveStreams } from "@/components/social/LiveStreams";
import { DiscordServerPanel } from "@/components/social/DiscordServerPanel";
import { PageHero } from "@/components/ui/PageHero";
import { guildLinks, type GuildLinkKey } from "@/config/guild";

export const metadata: Metadata = {
  title: "Social",
  description: "Watch Last Try members live and find the guild elsewhere.",
};

const socialMeta: Record<GuildLinkKey, { label: string; icon: LucideIcon }> = {
  discord: { label: "Discord", icon: MessageCircle },
  twitch: { label: "Twitch", icon: Radio },
  warcraftLogs: { label: "Warcraft Logs", icon: Shield },
  raiderIo: { label: "Raider.IO", icon: Shield },
  armory: { label: "Armory", icon: BookOpen },
  wowProgress: { label: "WoWProgress", icon: Trophy },
  youtube: { label: "YouTube", icon: Play },
};

export default function SocialPage() {
  const socials = (Object.entries(guildLinks) as [GuildLinkKey, string][]).filter(([, href]) => Boolean(href));
  return (
    <>
      <PageHero
        title="Social"
        description="Catch a raid from somebody else's point of view, or find us in the usual corners of the internet."
        image="/images/page-heroes/social.png"
        imageAlt="Fantasy adventurers sharing stories around a campfire beneath a night sky"
      />
      <section className="section-shell py-14 sm:py-18">
        <LiveStreams />
      </section>
      <DiscordServerPanel />
      <section className="py-14 sm:py-18">
        <div className="section-shell">
          <h2 className="display-font text-[2rem] leading-tight sm:text-[2.5rem]">Links</h2>
          {socials.length > 0 ? (
            <div className="mt-7 grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
              {socials.map(([key, href]) => {
                const Icon = socialMeta[key].icon;
                return (
                  <a key={key} href={href} target="_blank" rel="noreferrer" className="surface flex min-h-28 items-center gap-4 p-5">
                    <Icon aria-hidden="true" className="text-[var(--accent-strong)]" size={23} strokeWidth={1.6} />
                    <span className="font-bold">{socialMeta[key].label}</span>
                  </a>
                );
              })}
            </div>
          ) : (
            <div className="surface mt-8 p-6">
              <p className="text-sm leading-6 text-[var(--muted)]">No links here yet. Somebody will remember eventually.</p>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
