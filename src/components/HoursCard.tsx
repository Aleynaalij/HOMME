"use client";

import { useEffect, useState } from "react";
import type { BusinessHours } from "@/lib/types";
import { WEEKDAYS, formatClock, shopNow } from "@/lib/format";

function toMin(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function status(hours: BusinessHours[]) {
  const now = shopNow();
  const today = hours.find((h) => h.weekday === now.weekday);
  if (today?.is_open && today.open_time && today.close_time) {
    if (now.minutes < toMin(today.open_time)) return { open: false, text: `Opens today at ${formatClock(today.open_time)}` };
    if (now.minutes < toMin(today.close_time)) return { open: true, text: `Open until ${formatClock(today.close_time)}` };
  }
  for (let i = 1; i <= 7; i++) {
    const wd = (now.weekday + i) % 7;
    const h = hours.find((x) => x.weekday === wd);
    if (h?.is_open) return { open: false, text: `Closed · Opens ${i === 1 ? "tomorrow" : WEEKDAYS[wd]} at ${formatClock(h.open_time)}` };
  }
  return { open: false, text: "Closed" };
}

export function HoursCard({ hours }: { hours: BusinessHours[] }) {
  const [today, setToday] = useState<number | null>(null);
  const [st, setSt] = useState<{ open: boolean; text: string } | null>(null);

  useEffect(() => {
    setToday(shopNow().weekday);
    setSt(status(hours));
  }, [hours]);

  return (
    <div>
      <p className={`mb-4 min-h-5 text-sm font-semibold ${st?.open ? "text-ok" : "text-gold"}`}>{st?.text}</p>
      <ul className="space-y-2.5 text-sm">
        {WEEKDAYS.map((name, wd) => {
          const h = hours.find((x) => x.weekday === wd);
          const isToday = wd === today;
          return (
            <li key={wd} className={`flex justify-between ${isToday ? "font-semibold text-fg" : "text-muted"}`}>
              <span>{name}</span>
              <span>{h?.is_open ? `${formatClock(h.open_time)} – ${formatClock(h.close_time)}` : "Closed"}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
