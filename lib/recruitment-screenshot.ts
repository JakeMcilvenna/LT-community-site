import "server-only";

import { randomUUID } from "node:crypto";

import { put } from "@vercel/blob";

const EXTENSIONS_BY_MIME_TYPE = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} as const;

type SupportedScreenshotMimeType = keyof typeof EXTENSIONS_BY_MIME_TYPE;

export async function uploadRecruitmentScreenshot(file: File): Promise<string> {
  const extension = EXTENSIONS_BY_MIME_TYPE[file.type as SupportedScreenshotMimeType];
  if (!extension) throw new Error("Unsupported recruitment screenshot type.");

  const datePrefix = new Date().toISOString().slice(0, 10);
  const blob = await put(
    `recruitment/ui/${datePrefix}/${randomUUID()}.${extension}`,
    file,
    {
      access: "public",
      addRandomSuffix: false,
      contentType: file.type,
    },
  );

  const url = new URL(blob.url);
  if (url.protocol !== "https:") throw new Error("Blob upload did not return an HTTPS URL.");
  return url.toString();
}
