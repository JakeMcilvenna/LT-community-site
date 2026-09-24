"use client";

import { RotateCcw } from "lucide-react";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <section className="section-shell flex min-h-[76dvh] flex-col items-start justify-center py-32">
      <p className="text-sm font-semibold text-[var(--accent-strong)]">Application error</p>
      <h1 className="display-font mt-4 text-5xl font-semibold tracking-[-0.04em] sm:text-7xl">Something went wrong</h1>
      <p className="mt-6 max-w-xl text-base leading-7 text-[var(--muted)]">It fixes more things than it should.</p>
      <button type="button" onClick={reset} className="button-primary mt-9">
        <RotateCcw aria-hidden="true" size={17} strokeWidth={1.8} /> Try again
      </button>
    </section>
  );
}
