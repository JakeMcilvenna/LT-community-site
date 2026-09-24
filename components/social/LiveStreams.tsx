import { Radio, UserRound } from "lucide-react";
import Image from "next/image";

import { StreamCard } from "@/components/social/StreamCard";
import { getLiveGuildStreams } from "@/lib/twitch";

export async function LiveStreams() {
  const data = await getLiveGuildStreams();

  return (
    <div>
      {data.live.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data.live.map((stream) => <StreamCard key={stream.id} stream={stream} />)}
        </div>
      ) : (
        <div className="surface flex min-h-64 flex-col items-center justify-center px-6 text-center">
          <Radio aria-hidden="true" className="text-[var(--accent-strong)]" size={30} strokeWidth={1.5} />
          <h2 className="display-font mt-5 text-3xl font-semibold">No streams live</h2>
          <p className="mt-3 max-w-md text-sm leading-6 text-[var(--muted)]">A rare outbreak of productivity. Check back on raid night.</p>
        </div>
      )}

      {data.offline.length > 0 ? (
        <div className="mt-12">
          <h2 className="display-font text-3xl font-semibold">Streamers</h2>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.offline.map((streamer) => (
              <a key={streamer.username} href={streamer.url} target="_blank" rel="noreferrer" className="surface flex items-center gap-4 p-4">
                {streamer.profileImageUrl ? (
                  <Image src={streamer.profileImageUrl} alt="" width={48} height={48} className="size-12 rounded-xl object-cover" />
                ) : (
                  <span className="grid size-12 place-items-center rounded-xl border border-white/10 bg-[#090b0d]"><UserRound aria-hidden="true" size={19} strokeWidth={1.6} /></span>
                )}
                <div>
                  <h3 className="font-bold">{streamer.memberName}</h3>
                  <p className="mt-1 text-xs text-[var(--muted)]">twitch.tv/{streamer.username}</p>
                </div>
              </a>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
