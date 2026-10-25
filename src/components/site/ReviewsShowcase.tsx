"use client";

import { useEffect, useState } from "react";
import type { Review } from "@/lib/types";
import { initials, relativeTime } from "@/lib/format";
import { Stars } from "@/components/Stars";

/** Rotating featured quotes + a wall of every client who left five stars. */
export function ReviewsShowcase({ reviews }: { reviews: Review[] }) {
  const featured = reviews.filter((r) => r.body && r.body.length > 40);
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (featured.length < 2 || paused) return;
    const id = setInterval(() => setI((n) => (n + 1) % featured.length), 7000);
    return () => clearInterval(id);
  }, [featured.length, paused]);

  const r = featured[i];

  return (
    <div>
      {r && (
        <figure className="lux-card relative overflow-hidden px-6 py-12 text-center md:px-16 md:py-16"
          onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
          <span aria-hidden className="pointer-events-none absolute -top-6 left-1/2 -translate-x-1/2 font-display text-[11rem] leading-none text-gold/10">“</span>
          <Stars rating={r.rating} className="h-4 w-4" />
          <blockquote key={r.id} className="float-in mx-auto mt-6 max-w-3xl font-display text-2xl leading-snug text-ivory md:text-[2.1rem]">
            {r.body}
          </blockquote>
          <figcaption className="mt-7 text-[0.7rem] font-semibold uppercase tracking-[0.35em] text-gold">
            {r.author_name} <span className="text-muted">· {relativeTime(r.created_at)}</span>
          </figcaption>
          {featured.length > 1 && (
            <div className="mt-8 flex justify-center gap-2">
              {featured.map((f, n) => (
                <button key={f.id} onClick={() => setI(n)} aria-label={`Show review ${n + 1}`}
                  className={`h-1.5 rounded-full transition-all ${n === i ? "w-8 bg-gold" : "w-1.5 bg-white/20"}`} />
              ))}
            </div>
          )}
        </figure>
      )}

      <div className="mt-6 flex flex-wrap justify-center gap-2">
        {reviews.map((rv) => (
          <span key={rv.id} title={rv.body ?? undefined}
            className="flex items-center gap-2 rounded-full border border-white/8 bg-white/[0.02] py-1.5 pl-1.5 pr-3.5 text-xs text-muted">
            <span className="grid h-6 w-6 place-items-center rounded-full bg-gold/15 text-[0.6rem] font-bold text-gold">{initials(rv.author_name)}</span>
            {rv.author_name}
            <span className="text-gold">★</span>
          </span>
        ))}
      </div>
    </div>
  );
}
