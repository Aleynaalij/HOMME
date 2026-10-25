"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { brand } from "@/lib/config";
import { Logo } from "@/components/Logo";
import { LiveDot, useLiveStatus } from "@/components/live";
import { InstagramIcon, TikTokIcon } from "@/components/icons";

const LINKS = [
  { href: "/#menu", label: "Menu" },
  { href: "/#work", label: "The Work" },
  { href: "/#reviews", label: "Reviews" },
  { href: "/#visit", label: "Visit" },
];

export function SiteNav({ banner }: { banner?: string | null }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const live = useLiveStatus();

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 24);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
  }, [open]);

  return (
    <>
      {banner && (
        <div className="relative z-40 bg-gradient-to-r from-gold-deep via-gold to-gold-deep px-4 py-2 text-center text-[0.72rem] font-semibold tracking-wide text-black">
          {banner}
        </div>
      )}
      {live?.live && (
        <Link href="/live" className="relative z-40 flex items-center justify-center gap-2.5 bg-red-700 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white">
          <LiveDot /> Tash is live from the chair — watch now
        </Link>
      )}
      <header className={`sticky top-0 z-40 transition-all duration-500 ${scrolled ? "border-b border-white/5 bg-bg/75 backdrop-blur-2xl" : "bg-transparent"}`}>
        <div className="mx-auto flex h-[4.5rem] max-w-7xl items-center justify-between px-5 md:px-8">
          <Logo className="h-6 w-auto md:h-7" />
          <nav className="hidden items-center gap-9 text-[0.7rem] font-semibold uppercase tracking-[0.28em] text-muted lg:flex">
            {LINKS.map((l) => (
              <a key={l.href} href={l.href} className="transition hover:text-ivory">{l.label}</a>
            ))}
            {live?.channel && (
              <Link href="/live" className="flex items-center gap-2 transition hover:text-ivory">
                {live.live && <LiveDot className="!h-2 !w-2" />} Live
              </Link>
            )}
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/book" className="btn-gold !px-5 !py-2.5 !text-[0.66rem]">Book</Link>
            <button onClick={() => setOpen(true)} className="grid h-10 w-10 place-items-center rounded-full border border-white/10 lg:hidden" aria-label="Open menu">
              <span className="block h-px w-4 bg-ivory shadow-[0_5px_0_var(--ivory),0_-5px_0_var(--ivory)]" />
            </button>
          </div>
        </div>
      </header>

      {open && (
        <div className="fixed inset-0 z-[70] flex flex-col bg-bg/95 backdrop-blur-2xl lg:hidden">
          <div className="flex h-[4.5rem] items-center justify-between px-5">
            <Logo className="h-6 w-auto" />
            <button onClick={() => setOpen(false)} className="grid h-10 w-10 place-items-center rounded-full border border-white/10 text-ivory" aria-label="Close menu">✕</button>
          </div>
          <nav className="flex flex-1 flex-col justify-center gap-2 px-8">
            {[...LINKS, ...(live?.channel ? [{ href: "/live", label: live.live ? "Live now" : "Live" }] : [])].map((l, i) => (
              <a key={l.href} href={l.href} onClick={() => setOpen(false)}
                className="float-in flex items-baseline gap-4 border-b border-white/5 py-4 font-display text-4xl text-ivory" style={{ animationDelay: `${i * 60}ms` }}>
                <span className="section-num text-sm">0{i + 1}</span> {l.label}
              </a>
            ))}
          </nav>
          <div className="space-y-4 px-8 pb-10">
            <Link href="/book" onClick={() => setOpen(false)} className="btn-gold w-full">Book your chair</Link>
            <div className="flex justify-center gap-3">
              <a href={brand.instagram} target="_blank" rel="noopener noreferrer" className="btn-line !p-3" aria-label="Instagram"><InstagramIcon /></a>
              <a href={brand.tiktok} target="_blank" rel="noopener noreferrer" className="btn-line !p-3" aria-label="TikTok"><TikTokIcon /></a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
