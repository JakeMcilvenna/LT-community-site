import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { EventCard } from "@/components/events/EventCard";
import { getUpcomingEventData } from "@/lib/events";

export async function EventsPreview() {
  const data = await getUpcomingEventData(3);
  const events = data.events;
  return (
    <section className="py-18 sm:py-24">
      <div className="section-shell">
        <h2 className="display-font text-[2.5rem] leading-[1.02] tracking-[-0.025em] sm:text-[3.5rem]">Upcoming events</h2>
        <p className="mt-4 max-w-[40rem] text-[15px] leading-7 text-[var(--muted)]">
          Our upcoming schedule, shown in guild time. Check Discord before planning your life around it.
        </p>
        {events.length > 0 ? (
          <div className="mt-8 grid gap-3.5">
            {events.map((event) => <EventCard key={`${event.id}-${event.date}`} event={event} compact />)}
          </div>
        ) : (
          <div className="surface mt-8 p-6 text-center">
            <h3 className="display-font text-xl font-semibold">No upcoming events</h3>
            <p className="mt-2 text-sm text-[var(--muted)]">Either we&apos;re having a week off or somebody forgot to add it.</p>
          </div>
        )}
        <Link href="/events#raid-calendar" className="button-secondary mt-7">
          See the full calendar <ArrowRight aria-hidden="true" size={17} strokeWidth={1.8} />
        </Link>
      </div>
    </section>
  );
}
