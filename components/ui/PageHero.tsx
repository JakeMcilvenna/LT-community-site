import Image from "next/image";

type PageHeroProps = {
  title: string;
  description: string;
  image: string;
  imageAlt: string;
  imageClassName?: string;
};

export function PageHero({ title, description, image, imageAlt, imageClassName = "" }: PageHeroProps) {
  const heroImageClassName = [
    "-z-30 object-cover object-[66%_center] sm:object-center",
    imageClassName,
  ].filter(Boolean).join(" ");

  return (
    <header className="relative isolate flex min-h-[29rem] items-end overflow-hidden border-b border-white/8 pb-11 pt-28 sm:min-h-[33rem] sm:pb-14 lg:min-h-[36rem]">
      <Image
        src={image}
        alt={imageAlt}
        fill
        priority
        sizes="100vw"
        className={heroImageClassName}
      />
      <div className="pointer-events-none absolute inset-0 -z-20 bg-[#080a0c]/20" aria-hidden="true" />
      <div
        className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(8,10,12,0.9)_0%,rgba(8,10,12,0.52)_44%,rgba(8,10,12,0.08)_76%)]"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-[72%] bg-gradient-to-t from-[#080a0c] via-[#080a0c]/78 to-transparent"
        aria-hidden="true"
      />
      <div className="section-shell relative">
        <h1 className="display-font max-w-4xl text-[2.75rem] leading-[0.98] tracking-[-0.035em] text-balance sm:text-6xl lg:text-[5rem]">
          {title}
        </h1>
        <p className="mt-4 max-w-[38rem] text-[15px] leading-7 text-[#c4c1ba] text-pretty sm:text-[17px]">{description}</p>
      </div>
    </header>
  );
}
