import { ImageResponse } from "next/og";

import { BrandMark } from "@/components/ui/BrandMark";
import { guildConfig } from "@/config/guild";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
        padding: 72,
        background: "radial-gradient(circle at 72% 22%, #3a3325 0%, #111416 34%, #080a0c 72%)",
        color: "#f0ede6",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 30 }}>
        <div style={{ width: 92, height: 92, display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid #c6a66c", borderRadius: 18, color: "#dfc184", background: "rgba(8,10,12,0.68)" }}>
          <BrandMark width={68} height={68} />
        </div>
        <div style={{ fontSize: 104, letterSpacing: -6, fontWeight: 800 }}>{guildConfig.name.toUpperCase()}</div>
      </div>
      <div style={{ marginTop: 20, color: "#dfc184", fontSize: 30 }}>{guildConfig.tagline}</div>
    </div>,
    size,
  );
}
