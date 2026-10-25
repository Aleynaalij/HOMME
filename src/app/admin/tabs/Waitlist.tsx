"use client";

import { useCallback, useEffect, useState } from "react";
import { prettyPhone, smsLink } from "@/lib/contacts";
import { formatDateShort } from "@/lib/format";
import { sb } from "../shared";

type Entry = {
  id: string; name: string; phone: string | null; email: string | null; desired_date: string | null;
  service_names: string | null; notes: string | null; notified_at: string | null; created_at: string;
};

const dayLabel = (d: string | null) => (d ? formatDateShort(`${d}T12:00:00Z`) : "Any day");

/** Active waitlist, shown under upcoming appointments. */
export function Waitlist() {
  const [rows, setRows] = useState<Entry[]>([]);

  const load = useCallback(async () => {
    const { data } = await sb().from("waitlist").select("*").eq("status", "active")
      .order("desired_date", { ascending: true, nullsFirst: false }).order("created_at");
    setRows((data ?? []) as Entry[]);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function setStatus(id: string, status: "booked" | "removed") {
    await sb().from("waitlist").update({ status }).eq("id", id);
    load();
  }

  if (!rows.length) return null;
  return (
    <section className="mb-8">
      <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.25em] text-muted">
        Waitlist <span className="rounded-full bg-gold px-2 py-0.5 text-[0.65rem] text-black">{rows.length}</span>
      </h3>
      <div className="space-y-2">
        {rows.map((w) => {
          const text = `Hey ${w.name.split(/\s+/)[0]}, it's Tash! A spot opened up${w.desired_date ? ` on ${dayLabel(w.desired_date)}` : ""} — want it? Book here: ${location.origin}/book`;
          return (
            <div key={w.id} className="card flex flex-wrap items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{w.name} <span className="ml-1 text-sm font-normal text-gold">{dayLabel(w.desired_date)}</span></p>
                <p className="truncate text-xs text-muted">
                  {[prettyPhone(w.phone), w.email, w.service_names].filter(Boolean).join(" · ")}
                  {w.notified_at ? " · emailed about an opening" : ""}
                </p>
                {w.notes && <p className="mt-1 text-xs text-muted">“{w.notes}”</p>}
              </div>
              <div className="flex gap-2">
                {w.phone && <a href={smsLink(w.phone, text)} className="btn-primary !px-3 !py-1.5 !text-[0.65rem]">Text</a>}
                <button className="btn-ghost !px-3 !py-1.5 !text-xs" onClick={() => setStatus(w.id, "booked")}>Booked</button>
                <button className="btn-ghost !px-3 !py-1.5 !text-xs !text-danger" onClick={() => setStatus(w.id, "removed")}>✕</button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
