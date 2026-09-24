import { CalendarDays, CheckCircle2, Clock3, ExternalLink, MapPin, Repeat2, UsersRound } from "lucide-react";

import { formatEventDate, formatEventTime, isEventExpired } from "@/lib/events";
import type { GuildEvent } from "@/types/guild";

export function EventCard({ event, compact = false }: { event: GuildEvent; compact?: boolean }) {
  const expired = isEventExpired(event);
  const card = (
    <article className={`surface grid gap-4 p-4.5 ${event.team === "forever" ? "event-card--forever" : ""} ${compact ? "md:grid-cols-[8.5rem_1fr_auto] md:items-center" : "sm:grid-cols-[8rem_1fr] sm:p-5"}`}>
      <div className="border-b border-white/10 pb-4 sm:border-b-0 sm:border-r sm:pb-0 sm:pr-5">
        <p className="text-sm font-bold text-[var(--accent-strong)]">{formatEventDate(event.startAt)}</p>
        <p className="mt-2 flex items-center gap-2 text-xs text-[var(--muted)]">
          <Clock3 aria-hidden="true" size={14} strokeWidth={1.8} /> {formatEventTime(event.startAt)} - {formatEventTime(event.endAt)}
        </p>
      </div>
      <div>
        <div className="flex flex-wrap items-center gap-3">
          <h3 className="display-font text-[1.2rem] leading-tight">{event.title}</h3>
          <span className="rounded-lg border border-white/10 px-2.5 py-1 text-[11px] font-bold text-[#aaa8a2]">{event.type}</span>
          {expired ? <span className="raid-event-expired-badge">Expired</span> : null}
        </div>
        {!compact ? <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--muted)]">{event.description}</p> : null}
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-[#8f908b]">
          {event.location ? <span className="flex items-center gap-1.5"><MapPin aria-hidden="true" size={13} strokeWidth={1.8} /> {event.location}</span> : null}
          {event.recurringLabel ? <span className="flex items-center gap-1.5"><Repeat2 aria-hidden="true" size={13} strokeWidth={1.8} /> {event.recurringLabel}</span> : null}
          {event.status ? <span className="flex items-center gap-1.5"><CheckCircle2 aria-hidden="true" size={13} strokeWidth={1.8} /> {event.status}</span> : null}
          {event.signupLabel ? <span className="flex items-center gap-1.5"><UsersRound aria-hidden="true" size={13} strokeWidth={1.8} /> {event.signupLabel}</span> : null}
          {event.signupUrl && !expired ? <span className="flex items-center gap-1.5 text-[var(--accent-strong)]"><ExternalLink aria-hidden="true" size={13} strokeWidth={1.8} /> Click to sign up</span> : null}
        </div>
      </div>
      {compact ? <CalendarDays aria-hidden="true" className="hidden text-[#6e706c] md:block" size={22} strokeWidth={1.5} /> : null}
    </article>
  );

  return event.signupUrl && !expired ? (
    <a href={event.signupUrl} target="_blank" rel="noreferrer" aria-label={`Sign up for ${event.title} on Raid-Helper`} className="block transition-transform hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-strong)] focus-visible:ring-offset-4 focus-visible:ring-offset-[#080a0c]">
      {card}
    </a>
  ) : card;
}
