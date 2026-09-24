import { ArrowRight, Radio } from "lucide-react";
import Link from "next/link";

import { StreamCard } from "@/components/social/StreamCard";
import { getLiveGuildStreams } from "@/lib/twitch";

export async function StreamsPreview() {
  const streams = await getLiveGuildStreams();

  if (streams.live.length === 0) {
    return (
      <section className="section-shell pb-18 sm:pb-24">
        <div className="surface flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-7">
          <div className="flex items-start gap-4">
            <Radio aria-hidden="true" className="mt-1 shrink-0 text-[var(--accent-strong)]" size={22} strokeWidth={1.6} />
            <div>
              <h2 className="display-font text-[1.6rem] leading-tight">No live streams</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">They&apos;re probably being productive. Check again on raid night.</p>
            </div>
          </div>
          <Link href="/social" className="button-secondary shrink-0">See the streamers <ArrowRight aria-hidden="true" size={17} strokeWidth={1.8} /></Link>
        </div>
      </section>
    );
  }

  return (
    <section className="section-shell pb-18 sm:pb-24">
      <h2 className="display-font text-[2.5rem] leading-[1.02] tracking-[-0.025em] sm:text-[3.25rem]">Last Try live</h2>
      <div className="mt-7 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {streams.live.slice(0, 3).map((stream) => <StreamCard key={stream.id} stream={stream} />)}
      </div>
      <Link href="/social" className="button-secondary mt-7">See everyone <ArrowRight aria-hidden="true" size={17} strokeWidth={1.8} /></Link>
    </section>
  );
}
