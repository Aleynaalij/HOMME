"use client";

import { useState } from "react";
import type { Review } from "@/lib/types";
import { initials, relativeTime } from "@/lib/format";
import { Stars } from "./Stars";

export function ReviewsList({ reviews }: { reviews: Review[] }) {
  const withText = reviews.filter((r) => r.body);
  const rest = reviews.filter((r) => !r.body);
  const [showAll, setShowAll] = useState(false);

  return (
    <div>
      <div className="grid gap-4 md:grid-cols-2">
        {withText.map((r) => (
          <figure key={r.id} className="card flex flex-col p-6">
            <Stars rating={r.rating} />
            <blockquote className="mt-4 flex-1 font-display text-lg leading-relaxed text-fg/90">“{r.body}”</blockquote>
            <figcaption className="mt-5 flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-surface-2 text-xs font-bold text-gold">{initials(r.author_name)}</span>
              <span>
                <span className="block text-sm font-semibold">{r.author_name}</span>
                <span className="block text-xs text-muted">{relativeTime(r.created_at)}</span>
              </span>
            </figcaption>
          </figure>
        ))}
      </div>

      {rest.length > 0 && (
        <div className="mt-6">
          <div className={`grid gap-2 sm:grid-cols-2 lg:grid-cols-3 ${showAll ? "" : "max-h-[184px] overflow-hidden"}`}>
            {rest.map((r) => (
              <div key={r.id} className="flex items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-surface-2 text-xs font-bold text-gold">{initials(r.author_name)}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{r.author_name}</span>
                  <span className="block text-xs text-muted">{relativeTime(r.created_at)}</span>
                </span>
                <Stars rating={r.rating} className="h-3 w-3" />
              </div>
            ))}
          </div>
          {!showAll && rest.length > 6 && (
            <button onClick={() => setShowAll(true)} className="btn-ghost mt-4 w-full">
              Show all {reviews.length} reviews
            </button>
          )}
        </div>
      )}
    </div>
  );
}
