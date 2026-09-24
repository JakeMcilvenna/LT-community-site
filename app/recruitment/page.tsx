import type { Metadata } from "next";
import { ShieldAlert } from "lucide-react";

import { RecruitmentHub } from "@/components/recruitment/RecruitmentHub";
import { PageHero } from "@/components/ui/PageHero";
import type { ApplicationType } from "@/config/application-types";
import { verifyApplicationToken } from "@/lib/application-token";
import { getDiscordServerStatus } from "@/lib/discord";
import { getOpenRecruitmentNeeds } from "@/lib/recruitment";
import { getRecruitmentData } from "@/lib/wowaudit";

export const metadata: Metadata = {
  title: "Recruitment",
  description: "Apply to Last Try in Retail WoW or join our new Warcraft Forever guild.",
};

export default async function RecruitmentPage({
  searchParams,
}: {
  searchParams: Promise<{
    application?: string | string[];
    token?: string | string[];
  }>;
}) {
  const { application: requestedApplication, token } = await searchParams;
  const defaultApplicationType: ApplicationType =
    requestedApplication === "forever" ? "forever" : "retail";
  const hasApplicationToken = token !== undefined;
  const verifiedToken = typeof token === "string" ? verifyApplicationToken(token) : null;
  const hasInvalidApplicationToken =
    hasApplicationToken &&
    (!verifiedToken || verifiedToken.applicationType !== defaultApplicationType);
  const [data, discordServer] = await Promise.all([getRecruitmentData(), getDiscordServerStatus()]);
  const openNeeds = getOpenRecruitmentNeeds(data.needs);
  const discordInviteUrl = discordServer.status === "available" ? discordServer.inviteUrl : undefined;

  return (
    <>
      <PageHero
        title="Recruitment"
        description="Find your place in our Retail progression team or join us at the beginning of Warcraft Forever."
        image="/images/page-heroes/recruitment.png"
        imageAlt="An adventurer approaching a raid party at the gates of a mountain stronghold"
      />
      {hasInvalidApplicationToken ? (
        <section
          id="application"
          className="scroll-mt-24 border-t border-white/8 bg-[#0b0e10]/70 py-14 sm:py-18"
        >
          <div className="section-shell">
            <div
              className="surface max-w-3xl border-red-300/20 p-7 sm:p-10"
              role="alert"
            >
              <ShieldAlert
                className="text-red-300"
                size={32}
                strokeWidth={1.6}
                aria-hidden="true"
              />
              <h2 className="display-font mt-5 text-[2rem] leading-tight">
                Discord application link unavailable
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--muted)]">
                This Discord application link is invalid or has expired. Please return to
                Discord and request a new application link.
              </p>
            </div>
          </div>
        </section>
      ) : (
        <RecruitmentHub
          openNeeds={openNeeds}
          discordInviteUrl={discordInviteUrl}
          defaultApplicationType={defaultApplicationType}
          verifiedDiscordIdentity={
            verifiedToken
              ? {
                  discordUserId: verifiedToken.discordUserId,
                  discordTag: verifiedToken.discordTag,
                  applicationType: verifiedToken.applicationType,
                  discordReturnUrl: `https://discord.com/channels/${verifiedToken.guildId}`,
                }
              : undefined
          }
          applicationToken={verifiedToken && typeof token === "string" ? token : undefined}
        />
      )}
    </>
  );
}
