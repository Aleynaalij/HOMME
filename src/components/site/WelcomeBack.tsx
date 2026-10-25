"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getBrowserClient } from "@/lib/supabase";
import { savedTokens } from "@/lib/myAppointments";
import { formatDateLong, formatTime } from "@/lib/format";
import type { PublicAppointment } from "@/lib/types";

type Found = { token: string; a: PublicAppointment };

/** "Welcome back" card built from bookings remembered on this device. */
export function WelcomeBack() {
  const [next, setNext] = useState<Found | null>(null);
  const [last, setLast] = useState<Found | null>(null);

  useEffect(() => {
    const tokens = savedTokens().slice(0, 6);
    if (!tokens.length) return;
    const sb = getBrowserClient();
    Promise.all(
      tokens.map((t) => sb.rpc("get_appointment_by_token", { p_token: t }).then(({ data }) => {
        const a = (data as PublicAppointment[] | null)?.[0];
        return a ? { token: t, a } : null;
      })),
    ).then((rows) => {
      const found = rows.filter(Boolean) as Found[];
      const upcoming = found
        .filter((f) => ["confirmed", "pending_payment"].includes(f.a.status) && new Date(f.a.ends_at) > new Date())
        .sort((x, y) => +new Date(x.a.starts_at) - +new Date(y.a.starts_at))[0];
      const past = found
        .filter((f) => f.a.status !== "cancelled")
        .sort((x, y) => +new Date(y.a.starts_at) - +new Date(x.a.starts_at))[0];
      setNext(upcoming ?? null);
      setLast(upcoming ? null : past ?? null);
    });
  }, []);

  const f = next ?? last;
  if (!f) return null;
  const first = f.a.customer_name.split(/\s+/)[0];
  const services = f.a.services.map((s) => s.name).join(" + ");
  const again = `/book?services=${f.a.services.map((s) => s.id).join(",")}`;

  return (
    <div className="float-in mx-auto mt-10 w-full max-w-xl">
      <div className="lux-card shine flex flex-col gap-4 p-5 text-left sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.35em] text-gold">Welcome back, {first}</p>
          {next ? (
            <p className="mt-1.5 text-ivory">
              Your next cut: <span className="font-semibold">{formatDateLong(f.a.starts_at)}</span> at {formatTime(f.a.starts_at)}
            </p>
          ) : (
            <p className="mt-1.5 text-ivory">Ready for another <span className="font-semibold">{services}</span>?</p>
          )}
        </div>
        {next ? (
          <Link href={`/appointment/${f.token}`} className="btn-line shrink-0 !py-3">View</Link>
        ) : (
          <Link href={again} className="btn-gold shrink-0 !py-3">Book again</Link>
        )}
      </div>
    </div>
  );
}
