import "server-only";

import type { WowClass } from "@/data/recruitment-application";
import { getClassIconPath } from "@/lib/warcraft";

export const getClassIconUrl = (className: WowClass) => {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  return new URL(getClassIconPath(className), siteUrl).toString();
};
