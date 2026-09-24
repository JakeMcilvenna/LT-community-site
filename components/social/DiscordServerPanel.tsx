import { ArrowUpRight, Headphones, MessageCircle, Radio, Users } from "lucide-react";

import { getDiscordServerStatus } from "@/lib/discord";

export async function DiscordServerPanel() {
  const server = await getDiscordServerStatus();
  const available = server.status === "available";

  return (
    <section className="relative overflow-hidden border-y border-white/8 bg-[#0b0e10]/70 py-14 sm:py-18">
      <div className="pointer-events-none absolute right-[8%] top-1/2 size-72 -translate-y-1/2 rounded-full bg-[#5865f2]/8 blur-3xl" aria-hidden="true" />
      <div className="section-shell relative grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-[#aeb5ff]">
            <span className="size-2 rounded-full bg-[#5865f2]" aria-hidden="true" />
            Last Try on Discord
          </div>
          <h2 className="display-font mt-5 max-w-xl text-[2.4rem] leading-[1.04] tracking-[-0.025em] sm:text-[3.25rem]">
            Our Discord
          </h2>
          <p className="mt-5 max-w-2xl text-sm leading-7 text-[var(--muted)] sm:text-base">
            Join the conversation, find groups, catch announcements, and witness the post-wipe analysis in its natural habitat.
          </p>
          {available && server.inviteUrl ? (
            <a href={server.inviteUrl} target="_blank" rel="noreferrer" className="button-primary mt-7 bg-[#5865f2] text-white [border-color:#6f79f5] hover:bg-[#6873f5] hover:[border-color:#7e87fa]">
              Join our Discord <ArrowUpRight aria-hidden="true" size={17} strokeWidth={1.8} />
            </a>
          ) : null}
        </div>

        <div className="surface overflow-hidden border-[#5865f2]/25 bg-[#10131a]/92">
          <div className="flex items-center gap-4 border-b border-white/8 p-5 sm:p-6">
            <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-[#5865f2] text-white shadow-[0_10px_30px_rgba(88,101,242,0.22)]">
              <MessageCircle aria-hidden="true" size={25} strokeWidth={1.7} />
            </span>
            <div className="min-w-0">
              <p className="truncate font-bold text-[var(--foreground)]">{available ? server.name : "Last Try"}</p>
              <p className="mt-1 text-xs text-[var(--muted)]">World of Warcraft · Silvermoon EU</p>
            </div>
            <span className={`ml-auto size-2.5 shrink-0 rounded-full ${available ? "bg-[#46c46f] shadow-[0_0_12px_rgba(70,196,111,0.65)]" : "bg-[#62656b]"}`} aria-hidden="true" />
          </div>

          {available ? (
            <div className="grid grid-cols-2 divide-x divide-white/8">
              <div className="p-5 sm:p-6">
                <Users aria-hidden="true" className="text-[#aeb5ff]" size={19} strokeWidth={1.7} />
                <p className="numeric-font mt-4 text-2xl font-bold">{server.onlineCount.toLocaleString("en-GB")}</p>
                <p className="mt-1 text-xs text-[var(--muted)]">members online</p>
              </div>
              <div className="p-5 sm:p-6">
                <Headphones aria-hidden="true" className="text-[#aeb5ff]" size={19} strokeWidth={1.7} />
                <p className="numeric-font mt-4 text-2xl font-bold">{server.channelCount.toLocaleString("en-GB")}</p>
                <p className="mt-1 text-xs text-[var(--muted)]">public channels</p>
              </div>
            </div>
          ) : (
            <div className="flex gap-4 p-5 sm:p-6">
              <Radio aria-hidden="true" className="mt-0.5 shrink-0 text-[#aeb5ff]" size={19} strokeWidth={1.7} />
              <div>
                <p className="text-sm font-bold">Server status coming online</p>
                <p className="mt-2 text-xs leading-5 text-[var(--muted)]">Enable the Discord Server Widget to show live membership and the invite here.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
