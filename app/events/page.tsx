import type { Metadata } from "next";
import { Clock } from "lucide-react";

import { EventCard } from "@/components/events/EventCard";
import { RaidCalendar } from "@/components/events/RaidCalendar";
import { PageHero } from "@/components/ui/PageHero";
import { guildConfig } from "@/config/guild";
import { getUpcomingEventData, isEventExpired } from "@/lib/events";

// Event availability and sign-up status are time-sensitive, so always render this page
// from the current provider response rather than serving a stale calendar snapshot.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Events",
  description: "Upcoming Last Try raid nights, optional clears, and other plans.",
};

export default async function EventsPage() {
  const data = await getUpcomingEventData(48, new Date(), true);
  const events = data.events;
  const upcomingEvents = events.filter((event) => !isEventExpired(event));
  return (
    <>
      <PageHero
        title="Raid schedule"
        description="The plan is simple: turn up on time, bring what you need, and be ready to pull. The rest usually sorts itself out."
        image="/images/page-heroes/events.png"
        imageAlt="A fantasy raid party gathering by torchlight outside a mountain fortress"
        imageClassName="brightness-[1.3] saturate-[1.08]"
      />
      <section className="section-shell py-14 sm:py-18">
        <div id="raid-calendar" className="scroll-mt-24">
          <div className="flex items-center gap-3 text-sm text-[var(--muted)]">
            <Clock aria-hidden="true" size={17} strokeWidth={1.8} /> All times use {guildConfig.timezone}.
          </div>
          {events.length > 0 ? <RaidCalendar events={events} timeZone={guildConfig.timezone} /> : null}
        </div>
        {upcomingEvents.length > 0 ? (
          <div className="mt-10">
            <h2 className="display-font text-2xl font-semibold">Coming up next</h2>
            <div className="mt-5 grid gap-3.5 lg:grid-cols-2">
              {upcomingEvents.slice(0, 8).map((event) => <EventCard key={`${event.id}-${event.date}`} event={event} />)}
            </div>
          </div>
        ) : (
          <div className="surface mt-8 p-8 text-center">
            <h2 className="display-font text-2xl font-semibold">No upcoming events</h2>
            <p className="mt-3 text-sm text-[var(--muted)]">Either we&apos;re having a week off or somebody forgot to add it.</p>
          </div>
        )}
      </section>
    </>
  );
}
