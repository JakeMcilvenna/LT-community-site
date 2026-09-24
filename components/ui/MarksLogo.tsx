import Image from "next/image";

type MarksLogoProps = {
  className?: string;
  priority?: boolean;
  sizes?: string;
  tone?: "original" | "gold";
};

export function MarksLogo({ className = "h-12 w-8", priority = false, sizes = "48px", tone = "original" }: MarksLogoProps) {
  if (tone === "gold") {
    return (
      <span className={`block ${className}`} aria-hidden="true">
        <span
          className="block h-full w-full bg-[var(--accent-strong)]"
          style={{
            WebkitMaskImage: "url('/images/marks.png')",
            maskImage: "url('/images/marks.png')",
            WebkitMaskPosition: "center",
            maskPosition: "center",
            WebkitMaskRepeat: "no-repeat",
            maskRepeat: "no-repeat",
            WebkitMaskSize: "contain",
            maskSize: "contain",
          }}
        />
      </span>
    );
  }

  return (
    <span className={`block ${className}`} aria-hidden="true">
      <Image
        src="/images/marks.png"
        alt=""
        width={1024}
        height={1536}
        priority={priority}
        sizes={sizes}
        className="h-full w-full object-contain"
      />
    </span>
  );
}
