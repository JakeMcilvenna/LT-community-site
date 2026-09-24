"use client";

import { AnimatePresence, motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { FilePenLine, Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

import { MarksLogo } from "@/components/ui/MarksLogo";
import { guildConfig } from "@/config/guild";

export function Header() {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();
  const [menuOpen, setMenuOpen] = useState(false);
  const [streamIsLive, setStreamIsLive] = useState(false);
  const desktopNavRef = useRef<HTMLElement>(null);
  const [indicator, setIndicator] = useState<{ x: number; width: number } | null>(null);
  const { scrollY } = useScroll();
  const backgroundColor = useTransform(scrollY, [0, 96], ["rgba(8,10,12,0.18)", "rgba(8,10,12,0.91)"]);
  const borderColor = useTransform(scrollY, [0, 96], ["rgba(240,237,230,0)", "rgba(240,237,230,0.10)"]);

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  const handleApplyClick = () => {
    setMenuOpen(false);

    // Next.js can retain the current route for a same-page hash link. Scroll
    // explicitly so the form is reached reliably after the menu closes.
    if (pathname === "/recruitment") {
      window.requestAnimationFrame(() => {
        document.getElementById("application")?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  };

  useEffect(() => {
    let active = true;

    const updateLiveStatus = async () => {
      try {
        const response = await fetch("/api/streams/status", { cache: "no-store" });
        if (!response.ok) return;
        const data = (await response.json()) as { live?: boolean };
        if (active) setStreamIsLive(data.live === true);
      } catch {
        // Keep navigation usable if Twitch is temporarily unavailable.
      }
    };

    void updateLiveStatus();
    const interval = window.setInterval(updateLiveStatus, 60_000);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, []);

  useLayoutEffect(() => {
    const nav = desktopNavRef.current;
    const activeLink = nav?.querySelector<HTMLElement>("[aria-current='page']");

    if (!nav || !activeLink) return;

    const updateIndicator = () => {
      const horizontalPadding = 14;

      setIndicator({
        x: activeLink.offsetLeft + horizontalPadding,
        width: activeLink.offsetWidth - horizontalPadding * 2,
      });
    };

    updateIndicator();

    const resizeObserver = new ResizeObserver(updateIndicator);
    resizeObserver.observe(nav);
    resizeObserver.observe(activeLink);

    return () => resizeObserver.disconnect();
  }, [pathname]);

  return (
    <motion.header
      style={{ backgroundColor, borderColor }}
      className="fixed inset-x-0 top-0 z-50 h-[68px] border-b backdrop-blur-xl"
    >
      <div className="section-shell flex h-full items-center justify-between">
        <Link href="/" onClick={() => setMenuOpen(false)} className="group flex items-center gap-1.5" aria-label="Last Try home">
          <span className="grid h-10 w-7 place-items-center">
            <MarksLogo className="h-9 w-7" priority sizes="28px" />
          </span>
          <span className="display-font text-[15px] tracking-[0.09em]">LAST TRY</span>
        </Link>

        <nav ref={desktopNavRef} className="relative hidden items-center gap-1 lg:flex" aria-label="Primary navigation">
          {guildConfig.navigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(item.href) ? "page" : undefined}
              className={`relative rounded-md px-3.5 py-2 text-[13px] font-semibold tracking-[-0.005em] transition-colors ${
                isActive(item.href) ? "text-[var(--accent-strong)]" : "text-[#d1cec7] hover:text-[var(--foreground)]"
              }`}
            >
              <span className="inline-flex items-center gap-2">
                {item.label}
                {item.href === "/social" && streamIsLive ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-red-400/35 bg-red-500/12 px-1.5 py-0.5 text-[9px] font-extrabold tracking-[0.08em] text-red-300" aria-label="A guild member is live on Twitch">
                    <span className="size-1.5 rounded-full bg-red-400 motion-safe:animate-pulse" aria-hidden="true" />
                    LIVE
                  </span>
                ) : null}
              </span>
            </Link>
          ))}
          {indicator ? (
            <motion.span
              initial={false}
              animate={{ x: indicator.x, width: indicator.width }}
              transition={reduceMotion ? { duration: 0 } : { duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
              className="pointer-events-none absolute -bottom-1 left-0 h-px bg-[var(--accent-strong)]"
            />
          ) : null}
        </nav>

        <div className="hidden lg:block">
          <Link href="/recruitment#application" className="button-primary min-h-9 gap-1.5 px-3 text-xs">
            <FilePenLine aria-hidden="true" size={15} strokeWidth={1.9} />
            Apply
          </Link>
        </div>

        <button
          type="button"
          className="grid size-11 place-items-center rounded-lg border border-white/15 bg-[#0b0d0f]/60 lg:hidden"
          aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? <X aria-hidden="true" size={21} strokeWidth={1.8} /> : <Menu aria-hidden="true" size={21} strokeWidth={1.8} />}
        </button>
      </div>

      <AnimatePresence>
        {menuOpen ? (
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
            transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
            className="border-b border-white/10 bg-[#0b0d0f]/96 px-4 pb-6 pt-3 backdrop-blur-xl lg:hidden"
          >
            <nav className="mx-auto grid max-w-[88rem] gap-1" aria-label="Mobile navigation">
              {guildConfig.navigation.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  aria-current={isActive(item.href) ? "page" : undefined}
                  className={`rounded-lg px-4 py-3 text-base font-semibold ${isActive(item.href) ? "bg-white/6 text-[var(--accent-strong)]" : "text-[#d1cec7]"}`}
                >
                  <span className="flex items-center justify-between gap-3">
                    {item.label}
                    {item.href === "/social" && streamIsLive ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-red-400/35 bg-red-500/12 px-2 py-1 text-[10px] font-extrabold tracking-[0.08em] text-red-300" aria-label="A guild member is live on Twitch">
                        <span className="size-1.5 rounded-full bg-red-400 motion-safe:animate-pulse" aria-hidden="true" />
                        LIVE
                      </span>
                    ) : null}
                  </span>
                </Link>
              ))}
              <Link href="/recruitment#application" onClick={handleApplyClick} className="button-primary mt-3 w-full gap-2">
                <FilePenLine aria-hidden="true" size={16} strokeWidth={1.9} />
                Apply
              </Link>
            </nav>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.header>
  );
}
