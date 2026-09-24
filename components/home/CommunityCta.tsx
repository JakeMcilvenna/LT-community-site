import { ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export function CommunityCta() {
  return (
    <section className="section-shell pb-18 sm:pb-24">
      <div className="surface relative isolate min-h-[23rem] overflow-hidden p-6 sm:p-10 lg:p-12">
        <Image src="/images/raids/midnight-season-1/the-voidspire.jpg" alt="" fill sizes="(max-width: 1400px) 100vw, 1400px" className="-z-30 object-cover opacity-45" />
        <div className="absolute inset-0 -z-20 bg-gradient-to-r from-[#080a0c] via-[#080a0c]/84 to-[#080a0c]/24" aria-hidden="true" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-[#080a0c]/80 to-transparent" aria-hidden="true" />
        <div className="flex min-h-[17rem] max-w-2xl flex-col justify-end">
          <h2 className="display-font text-[2.5rem] leading-[1.02] tracking-[-0.025em] sm:text-[3.5rem]">Meet the community</h2>
          <p className="mt-4 max-w-xl text-[15px] leading-7 text-[#c6c2ba]">Meet the roster, catch a stream, and put a few voices to the names in raid chat.</p>
          <Link href="/social" className="button-primary mt-7 w-fit">See what we&apos;re up to <ArrowRight aria-hidden="true" size={17} strokeWidth={1.8} /></Link>
        </div>
      </div>
    </section>
  );
}
