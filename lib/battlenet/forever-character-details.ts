import { z } from "zod";

import { buildForeverCharacterProfileLinks } from "../forever-character-profile.ts";
import type { VerifiedForeverCharacter, VerifiedForeverCharacterDetails } from "./types";

const identity = z.object({
  id: z.union([z.number().int().nonnegative(), z.string().min(1)]),
  name: z.string().min(1),
  surname: z.string().min(1),
});
const profileSchema = identity.extend({
  level: z.number().int().nonnegative(),
  character_class: z.object({ name: z.string().min(1) }).optional(),
  active_spec: z.object({ name: z.string().min(1) }).optional(),
  ruleset: z.object({ id: z.number().int(), name: z.string().optional() }).optional(),
});
// Forever exposes Classic-style talent groups instead of Retail loadouts.
// https://github.com/Pinta365/blizzard_api/blob/main/src/wow_forever/character.ts
const talentsSchema = z.object({
  character: identity,
  specialization_groups: z.array(z.object({
    is_active: z.boolean(),
    specializations: z.array(z.object({
      specialization_name: z.string().min(1),
      spent_points: z.number().int().nonnegative(),
    })).optional(),
  })),
});

export function enrichForeverCharacter(owned: VerifiedForeverCharacter, profile: unknown, talents: unknown): VerifiedForeverCharacterDetails {
  const matches = (candidate: z.infer<typeof identity>) => String(candidate.id) === owned.id
    && `${candidate.name} ${candidate.surname}`.toLowerCase() === owned.fullName.toLowerCase();
  const parsedProfile = profileSchema.safeParse(profile);
  const summary = parsedProfile.success && matches(parsedProfile.data) ? parsedProfile.data : undefined;
  const parsedTalents = talentsSchema.safeParse(talents);
  const trees = parsedTalents.success && matches(parsedTalents.data.character)
    ? parsedTalents.data.specialization_groups.find((group) => group.is_active)?.specializations ?? [] : [];
  const mostPoints = Math.max(0, ...trees.map((tree) => tree.spent_points));
  const talentSpec = mostPoints > 0
    ? trees.filter((tree) => tree.spent_points === mostPoints).map((tree) => tree.specialization_name).join(" / ") : undefined;
  const character = {
    ...owned,
    className: summary?.character_class?.name ?? owned.className,
    level: summary?.level ?? owned.level,
    rulesetId: summary?.ruleset?.id ?? owned.rulesetId,
    rulesetName: summary?.ruleset?.name ?? owned.rulesetName,
    specialization: summary?.active_spec?.name ?? talentSpec,
  };
  return { ...character, ...buildForeverCharacterProfileLinks(character) };
}
