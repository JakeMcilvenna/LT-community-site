import { Suspense } from "react";

import { CommunityCta } from "@/components/home/CommunityCta";
import { EventsPreview } from "@/components/home/EventsPreview";
import { Hero } from "@/components/home/Hero";
import { ProgressionSection } from "@/components/home/ProgressionSection";
import { RecruitmentPreview } from "@/components/home/RecruitmentPreview";
import { StreamsPreview } from "@/components/home/StreamsPreview";
import { Reveal } from "@/components/ui/Reveal";
import { SectionSkeleton } from "@/components/ui/SectionSkeleton";
import { getRaidProgression } from "@/lib/raiderio";

export const revalidate = 60;

export default async function HomePage() {
  const raidProgression = await getRaidProgression();

  return (
    <>
      <Hero />
      <ProgressionSection
        raidTiers={raidProgression.tiers}
        source={raidProgression.source}
        profileUrl={raidProgression.profileUrl}
      />
      <Reveal>
        <Suspense fallback={<SectionSkeleton cards={4} />}>
          <RecruitmentPreview />
        </Suspense>
      </Reveal>
      <Reveal>
        <Suspense fallback={<SectionSkeleton cards={3} />}>
          <EventsPreview />
        </Suspense>
      </Reveal>
      <Reveal>
        <Suspense fallback={<SectionSkeleton cards={2} />}>
          <StreamsPreview />
        </Suspense>
      </Reveal>
      <Reveal><CommunityCta /></Reveal>
    </>
  );
}
