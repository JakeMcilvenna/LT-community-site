import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function NotFound() {
  return (
    <section className="section-shell flex min-h-[76dvh] flex-col items-start justify-center py-32">
      <p className="text-sm font-semibold text-[var(--accent-strong)]">Error 404</p>
      <h1 className="display-font mt-4 text-5xl font-semibold tracking-[-0.04em] sm:text-7xl">Page not found</h1>
      <p className="mt-6 max-w-xl text-base leading-7 text-[var(--muted)]">Either the page moved or the URL is having a bad day.</p>
      <Link href="/" className="button-secondary mt-9">
        <ArrowLeft aria-hidden="true" size={17} strokeWidth={1.8} /> Return home
      </Link>
    </section>
  );
}
