import type { Metadata } from "next";
import { MemberDirectory } from "@/components/members/MemberDirectory";
import { PageHero } from "@/components/ui/PageHero";
import { getForeverGuildMemberData } from "@/lib/forever-roster";
import { getGuildMemberData } from "@/lib/wowaudit";

export const metadata: Metadata = {
  title: "Members",
  description: "Meet the people pressing buttons for Last Try.",
};

export default async function MembersPage({
  searchParams,
}: {
  searchParams: Promise<{ guild?: string | string[] }>;
}) {
  const { guild } = await searchParams;
  const defaultGuild = guild === "forever" ? "forever" : "retail";
  const [retailData, foreverData] = await Promise.all([
    getGuildMemberData(),
    getForeverGuildMemberData(),
  ]);

  return (
    <>
      <PageHero
        title="Guild roster"
        description="A mostly sensible group of raiders, questionable alts, and the occasional person standing somewhere they shouldn't."
        image="/images/page-heroes/members.png"
        imageAlt="A fantasy adventuring party overlooking a distant city at dawn"
      />
      <section className="section-shell py-14 sm:py-18">
        <MemberDirectory
          retailMembers={retailData.members}
          foreverMembers={foreverData.members}
          foreverAvailable={foreverData.integrationStatus === "connected"}
          defaultGuild={defaultGuild}
        />
      </section>
    </>
  );
}
