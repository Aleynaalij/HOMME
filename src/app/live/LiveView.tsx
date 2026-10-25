"use client";

import Link from "next/link";
import { brand } from "@/lib/config";
import { PLATFORM_LABEL } from "@/lib/live-shared";
import type { BusinessHours } from "@/lib/types";
import { SiteNav } from "@/components/site/SiteNav";
import { SiteFooter } from "@/components/site/SiteFooter";
import { HoursCard } from "@/components/HoursCard";
import { LiveDot, LivePlayer, useLiveStatus } from "@/components/live";
import { InstagramIcon, TikTokIcon } from "@/components/icons";

export function LiveView({ hours }: { hours: BusinessHours[] }) {
  const status = useLiveStatus(30_000);

  return (
    <div className="min-h-dvh">
      <SiteNav />

      <main className="mx-auto max-w-6xl px-5 pt-8">
        {status === null && <div className="aspect-video w-full animate-pulse rounded-2xl bg-surface" />}

        {status?.live && (
          <>
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.3em] text-red-500">
                  <LiveDot /> Live{status.viewers ? ` · ${status.viewers} watching` : ""}
                </p>
                <h1 className="mt-2 font-display text-4xl text-ivory md:text-5xl">{status.title || <>In the chair <em className="text-gold-gradient italic">with Tash</em></>}</h1>
              </div>
              {status.watchUrl && (
                <a href={status.watchUrl} target="_blank" rel="noopener noreferrer" className="btn-line">
                  Chat on {PLATFORM_LABEL[status.platform]}
                </a>
              )}
            </div>
            <LivePlayer status={status} />
          </>
        )}

        {status && !status.live && (
          <div className="lux-card flex flex-col items-center px-6 py-16 text-center">
            <span className="rounded-full border border-line px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-muted">Offline</span>
            <h1 className="mt-6 font-display text-5xl text-ivory md:text-6xl">Off the air — <em className="text-gold-gradient italic">for now.</em></h1>
            <p className="mt-4 max-w-md text-muted">
              Streams happen from the chair during shop hours — real cuts, real fades, real barbershop talk. This page goes live automatically.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              {status.watchUrl && (
                <a href={status.watchUrl} target="_blank" rel="noopener noreferrer" className="btn-gold">
                  Follow on {PLATFORM_LABEL[status.platform]}
                </a>
              )}
              <a href={brand.instagram} target="_blank" rel="noopener noreferrer" className="btn-line"><InstagramIcon /> Instagram</a>
              <a href={brand.tiktok} target="_blank" rel="noopener noreferrer" className="btn-line"><TikTokIcon /> TikTok</a>
            </div>
          </div>
        )}

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <div className="lux-card p-6">
            <h2 className="mb-4 text-sm font-bold uppercase tracking-[0.2em]">Shop hours</h2>
            <HoursCard hours={hours} />
          </div>
          <div className="lux-card flex flex-col justify-between p-6">
            <div>
              <h2 className="font-display text-3xl text-ivory">Like what you <em className="text-gold-gradient italic">see?</em></h2>
              <p className="mt-2 text-muted">20+ years, every texture — men, women &amp; children. Grab a spot in the chair.</p>
            </div>
            <Link href="/book" className="btn-gold mt-6">Book an appointment</Link>
          </div>
        </div>
      </main>
      <div className="mt-20"><SiteFooter /></div>
    </div>
  );
}
