import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { ForeverRecruitmentCallout } from "@/components/recruitment/ForeverRecruitmentCallout";
import { RecruitmentCard } from "@/components/recruitment/RecruitmentCard";
import { getOpenRecruitmentNeeds } from "@/lib/recruitment";
import { getRecruitmentData } from "@/lib/wowaudit";

export async function RecruitmentPreview() {
  const data = await getRecruitmentData();
  const needs = getOpenRecruitmentNeeds(data.needs).slice(0, 4);

  return (
    <>
      <section className="border-y border-white/8 bg-[#0b0e10]/70 py-18 sm:py-22">
        <div className="section-shell grid gap-9 lg:grid-cols-[0.72fr_1.28fr] lg:items-start">
          <div className="lg:sticky lg:top-28">
            <p className="text-[0.68rem] font-bold uppercase tracking-[0.18em] text-[var(--accent-strong)]">Retail WoW</p>
            <h2 className="display-font mt-3 text-[2.5rem] leading-[1.02] tracking-[-0.025em] sm:text-[3.25rem]">Recruitment</h2>
            <p className="mt-4 max-w-lg text-[15px] leading-7 text-[var(--muted)]">View the roles we are currently recruiting.</p>
            <Link href="/recruitment" className="button-secondary recruitment-link--retail mt-7">
            View recruitment <ArrowRight aria-hidden="true" size={17} strokeWidth={1.8} />
          </Link>
        </div>
          <div className="grid gap-3.5 sm:grid-cols-2">
              {needs.map((need) => <RecruitmentCard key={need.id} need={need} />)}
          </div>
        </div>
      </section>

      <section className="border-b border-[#79c9c2]/12 bg-[radial-gradient(circle_at_78%_45%,rgba(72,160,149,0.08),transparent_32rem),#09100f] py-18 sm:py-22">
        <div className="section-shell grid gap-9 lg:grid-cols-[0.72fr_1.28fr] lg:items-start">
          <div className="lg:sticky lg:top-28">
            <p className="text-[0.68rem] font-bold uppercase tracking-[0.18em] text-[#79c9c2]">A new beginning</p>
            <h2 className="display-font mt-3 text-[2.5rem] leading-[1.02] tracking-[-0.025em] text-[#f1faf8] sm:text-[3.25rem]">Warcraft Forever</h2>
            <p className="mt-4 max-w-sm text-[15px] leading-7 text-[#9bb2ae]">A new guild, built together from day one.</p>
            <Link href="/recruitment?application=forever#application" className="button-secondary recruitment-link--forever mt-7">
              View Forever recruitment <ArrowRight aria-hidden="true" size={17} strokeWidth={1.8} />
            </Link>
          </div>
          <ForeverRecruitmentCallout compact showCta={false} />
        </div>
      </section>
    </>
  );
}
