import { ExternalLink, Eye } from "lucide-react";
import Image from "next/image";

import { MarksLogo } from "@/components/ui/MarksLogo";
import type { LiveStream } from "@/types/guild";

export function StreamCard({ stream }: { stream: LiveStream }) {
  return (
    <article className="surface overflow-hidden">
      <a href={stream.url} target="_blank" rel="noreferrer" className="group block">
        <div className="relative aspect-video overflow-hidden">
          <Image
            src={stream.thumbnailUrl}
            alt={`${stream.memberName} live on Twitch`}
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            className="scale-[1.025] object-cover transition-transform duration-500 ease-out group-hover:scale-100 group-focus-visible:scale-100"
          />

          <div className="absolute inset-0 z-10 transition-opacity duration-300 ease-out group-hover:opacity-0 group-focus-visible:opacity-0" aria-hidden="true">
            <div className="absolute inset-0 bg-[url('/images/streams/live-cover.png')] bg-cover bg-center" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_72%,transparent_0%,rgba(8,10,12,0.08)_38%,rgba(8,10,12,0.58)_100%)]" />
            <div className="absolute inset-0 grid place-items-center">
              <div className="flex flex-col items-center text-[#dfc184] drop-shadow-[0_3px_14px_rgba(8,10,12,0.9)]">
                <MarksLogo className="h-14 w-9" sizes="36px" tone="gold" />
                <span className="mt-2 text-[0.625rem] font-bold tracking-[0.24em] uppercase">Guild broadcast</span>
              </div>
            </div>
          </div>

          <div className="absolute inset-0 bg-gradient-to-t from-[#080a0c]/74 via-transparent to-transparent" aria-hidden="true" />
          <span className="absolute top-4 left-4 z-20 rounded-lg bg-[#a43f47] px-2.5 py-1.5 text-xs font-black text-[#f7eeee]">LIVE</span>
          <span className="numeric-font absolute right-4 bottom-4 z-20 flex items-center gap-1.5 rounded-lg bg-[#080a0c]/76 px-2.5 py-1.5 text-xs font-semibold backdrop-blur-md">
            <Eye aria-hidden="true" size={14} strokeWidth={1.8} /> {stream.viewerCount.toLocaleString("en-GB")}
          </span>
        </div>
        <div className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="font-bold text-[var(--foreground)]">{stream.memberName}</h3>
              <p className="mt-1 line-clamp-2 text-sm leading-6 text-[var(--muted)]">{stream.title}</p>
            </div>
            <ExternalLink aria-hidden="true" className="mt-1 shrink-0 text-[var(--accent-strong)]" size={18} strokeWidth={1.8} />
          </div>
          <p className="mt-4 text-xs font-semibold text-[#8d8e89]">{stream.gameName}</p>
        </div>
      </a>
    </article>
  );
}
