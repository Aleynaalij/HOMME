"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PLATFORM_LABEL, embedUrl, type LiveStatus } from "@/lib/live-shared";

export function useLiveStatus(intervalMs = 60_000) {
  const [status, setStatus] = useState<LiveStatus | null>(null);
  useEffect(() => {
    let alive = true;
    const load = () =>
      fetch("/api/live")
        .then((r) => (r.ok ? r.json() : null))
        .then((s) => alive && s && setStatus(s))
        .catch(() => {});
    load();
    const id = setInterval(load, intervalMs);
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    return () => {
      alive = false;
      clearInterval(id);
      window.removeEventListener("focus", onFocus);
    };
  }, [intervalMs]);
  return status;
}

export function LiveDot({ className = "" }: { className?: string }) {
  return (
    <span className={`relative inline-flex h-2.5 w-2.5 ${className}`}>
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
    </span>
  );
}

export function LivePlayer({ status }: { status: LiveStatus }) {
  const [host, setHost] = useState<string | null>(null);
  useEffect(() => setHost(window.location.hostname), []);
  if (!status.channel) return null;
  return (
    <div className="aspect-video w-full overflow-hidden rounded-2xl border border-line bg-black">
      {host && (
        <iframe
          src={embedUrl(status.platform, status.channel, host)}
          title={`Tash live on ${PLATFORM_LABEL[status.platform]}`}
          className="h-full w-full"
          allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
          allowFullScreen
        />
      )}
    </div>
  );
}

/** Red strip under the nav while Tash is live. */
export function LiveBanner() {
  const status = useLiveStatus();
  if (!status?.live) return null;
  return (
    <Link href="/live" className="flex items-center justify-center gap-2.5 bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500">
      <LiveDot />
      Tash is live now — watch the chair
      {status.viewers ? <span className="font-normal opacity-80">· {status.viewers} watching</span> : null}
    </Link>
  );
}

/** Home-page section that appears only while live. */
export function LiveSection() {
  const status = useLiveStatus();
  if (!status?.live || !status.channel) return null;
  return (
    <section className="border-b border-line bg-surface/40">
      <div className="mx-auto max-w-6xl px-5 py-14">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.3em] text-red-500"><LiveDot /> Live now</p>
            <h2 className="mt-3 font-display text-4xl font-bold">{status.title || "In the chair with Tash"}</h2>
          </div>
          <div className="flex gap-2">
            <Link href="/live" className="btn-ghost">Full screen</Link>
            <Link href="/book" className="btn-primary">Book your cut</Link>
          </div>
        </div>
        <LivePlayer status={status} />
      </div>
    </section>
  );
}

/** "Live" link for the nav, with a pulsing dot while live. */
export function LiveNavLink() {
  const status = useLiveStatus();
  if (!status?.channel) return null;
  return (
    <Link href="/live" className="flex items-center gap-1.5 hover:text-fg">
      {status.live && <LiveDot className="!h-2 !w-2" />} Live
    </Link>
  );
}
