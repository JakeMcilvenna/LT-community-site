export function SectionSkeleton({ cards = 3 }: { cards?: number }) {
  return (
    <section className="section-shell py-20" aria-label="Loading content" aria-busy="true">
      <div className="h-10 w-64 animate-pulse rounded-lg bg-white/7" />
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {Array.from({ length: cards }, (_, index) => <div key={index} className="h-36 animate-pulse rounded-[0.875rem] border border-white/8 bg-white/4" />)}
      </div>
    </section>
  );
}
