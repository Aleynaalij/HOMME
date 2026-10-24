"use client";

import Link from "next/link";
import { brand } from "@/lib/config";
import { PLATFORM_LABEL } from "@/lib/live-shared";
import type { BusinessHours } from "@/lib/types";
import { Logo } from "@/components/Logo";
import { HoursCard } from "@/components/HoursCard";
import { LiveDot, LivePlayer, useLiveStatus } from "@/components/live";
import { ArrowLeftIcon, InstagramIcon, TikTokIcon } from "@/components/icons";

export function LiveView({ hours }: { hours: BusinessHours[] }) {
  const status = useLiveStatus(30_000);

  return (
    <div className="min-h-dvh pb-28 md:pb-10">
      <header className="sticky top-0 z-30 border-b border-line/60 bg-bg/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
          <Link href="/" className="btn-ghost !p-2.5" aria-label="Back home"><ArrowLeftIcon /></Link>
          <Logo className="h-6 w-auto" />
          <Link href="/book" className="btn-primary !px-5 !py-2.5 !text-[0.7rem]">Book</Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 pt-8">
        {status === null && <div className="aspect-video w-full animate-pulse rounded-2xl bg-surface" />}

        {status?.live && (
          <>
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.3em] text-red-500">
                  <LiveDot /> Live{status.viewers ? ` · ${status.viewers} watching` : ""}
                </p>
                <h1 className="mt-2 font-display text-3xl font-bold md:text-4xl">{status.title || "In the chair with Tash"}</h1>
              </div>
              {status.watchUrl && (
                <a href={status.watchUrl} target="_blank" rel="noopener noreferrer" className="btn-ghost">
                  Chat on {PLATFORM_LABEL[status.platform]}
                </a>
              )}
            </div>
            <LivePlayer status={status} />
          </>
        )}

        {status && !status.live && (
          <div className="grain card flex flex-col items-center px-6 py-16 text-center">
            <span className="rounded-full border border-line px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-muted">Offline</span>
            <h1 className="mt-6 font-display text-4xl font-bold md:text-5xl">Tash isn&apos;t live right now</h1>
            <p className="mt-4 max-w-md text-muted">
              Streams happen from the chair during shop hours — real cuts, real fades, real barbershop talk. This page goes live automatically.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              {status.watchUrl && (
                <a href={status.watchUrl} target="_blank" rel="noopener noreferrer" className="btn-primary">
                  Follow on {PLATFORM_LABEL[status.platform]}
                </a>
              )}
              <a href={brand.instagram} target="_blank" rel="noopener noreferrer" className="btn-ghost"><InstagramIcon /> Instagram</a>
              <a href={brand.tiktok} target="_blank" rel="noopener noreferrer" className="btn-ghost"><TikTokIcon /> TikTok</a>
            </div>
          </div>
        )}

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <div className="card p-6">
            <h2 className="mb-4 text-sm font-bold uppercase tracking-[0.2em]">Shop hours</h2>
            <HoursCard hours={hours} />
          </div>
          <div className="card flex flex-col justify-between p-6">
            <div>
              <h2 className="font-display text-3xl font-bold">Like what you see?</h2>
              <p className="mt-2 text-muted">20+ years, every texture — men, women &amp; children. Grab a spot in the chair.</p>
            </div>
            <Link href="/book" className="btn-primary mt-6">Book an appointment</Link>
          </div>
        </div>
      </main>
    </div>
  );
}
