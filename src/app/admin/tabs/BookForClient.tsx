"use client";

import { useEffect, useMemo, useState } from "react";
import { brand } from "@/lib/config";
import { duration, formatTime, money, shopNow } from "@/lib/format";
import type { Service } from "@/lib/types";
import { Modal, Notice, sb, type Client } from "../shared";

/** Wall-clock date/time in the shop's timezone → UTC ISO. */
export function zonedToUtc(ymd: string, hm: string, tz = brand.timezone) {
  const guess = new Date(`${ymd}T${hm}:00Z`);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(guess);
  const g = (t: string) => Number(parts.find((p) => p.type === t)!.value);
  const asTz = Date.UTC(g("year"), g("month") - 1, g("day"), g("hour"), g("minute"));
  return new Date(guess.getTime() - (asTz - guess.getTime())).toISOString();
}

/** Tash books someone who called or texted — any day/time, overlaps still blocked. */
export function BookForClient({ onClose, onBooked }: { onClose: () => void; onBooked: () => void }) {
  const [services, setServices] = useState<Service[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [q, setQ] = useState("");
  const [f, setF] = useState({ name: "", phone: "", email: "", notes: "" });
  const [picked, setPicked] = useState<string[]>([]);
  const [date, setDate] = useState(shopNow().ymd);
  const [time, setTime] = useState("10:00");
  const [slots, setSlots] = useState<string[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    sb().from("services").select("*").order("sort_order").then(({ data }) => setServices((data ?? []) as Service[]));
    sb().from("client_stats").select("*").order("name").then(({ data }) => setClients((data ?? []) as Client[]));
  }, []);

  const chosen = services.filter((s) => picked.includes(s.id));
  const totalMin = chosen.reduce((a, s) => a + s.duration_min, 0);
  const totalCents = chosen.reduce((a, s) => a + s.price_cents, 0);

  useEffect(() => {
    if (!totalMin) return setSlots([]);
    sb().rpc("get_available_slots", { p_date: date, p_duration_min: totalMin })
      .then(({ data }) => setSlots(((data as string[] | null) ?? []).map((s) => new Date(s).toISOString())));
  }, [date, totalMin]);

  const matches = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (t.length < 2) return [];
    return clients.filter((c) => c.name.toLowerCase().includes(t) || (c.phone ?? "").includes(t.replace(/\D/g, "") || "~")).slice(0, 5);
  }, [q, clients]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!picked.length) return setMsg("Pick at least one service.");
    setBusy(true);
    setMsg(null);
    const { data: token, error } = await sb().rpc("admin_book_appointment", {
      p_service_ids: picked,
      p_starts_at: zonedToUtc(date, time),
      p_name: f.name,
      p_phone: f.phone,
      p_email: f.email,
      p_notes: f.notes || null,
    });
    setBusy(false);
    if (error) return setMsg(error.message);
    if (f.email) {
      fetch("/api/notify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, event: "booked" }) }).catch(() => {});
    }
    onBooked();
    onClose();
  }

  const shopHm = (iso: string) =>
    new Intl.DateTimeFormat("en-GB", { timeZone: brand.timezone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(iso));

  return (
    <Modal title="Book a client" onClose={onClose}>
      <form onSubmit={save} className="space-y-3">
        <div className="relative">
          <input className="input" placeholder="Search your clients…" value={q} onChange={(e) => setQ(e.target.value)} />
          {matches.length > 0 && (
            <ul className="absolute inset-x-0 top-full z-10 mt-1 overflow-hidden rounded-xl border border-line bg-surface-2">
              {matches.map((c) => (
                <li key={c.id}>
                  <button type="button" className="w-full px-4 py-2.5 text-left text-sm hover:bg-surface"
                    onClick={() => { setF({ ...f, name: c.name, phone: c.phone ?? "", email: c.email ?? "" }); setQ(""); }}>
                    <span className="font-semibold">{c.name}</span> <span className="text-muted">{c.phone ?? c.email}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <input className="input" required placeholder="Client name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        <div className="grid grid-cols-2 gap-2">
          <input className="input" type="tel" placeholder="Phone" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
          <input className="input" type="email" placeholder="Email (sends confirmation)" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
        </div>

        <div className="flex flex-wrap gap-1.5">
          {services.map((s) => (
            <button key={s.id} type="button"
              onClick={() => setPicked((p) => (p.includes(s.id) ? p.filter((x) => x !== s.id) : [...p, s.id]))}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${picked.includes(s.id) ? "border-gold bg-gold/15 text-fg" : "border-line text-muted"}`}>
              {s.name}
            </button>
          ))}
        </div>
        {chosen.length > 0 && <p className="text-sm text-muted">{money(totalCents)} · {duration(totalMin)}</p>}

        <div className="grid grid-cols-2 gap-2">
          <input className="input" type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
          <input className="input" type="time" required step={300} value={time} onChange={(e) => setTime(e.target.value)} />
        </div>
        {slots.length > 0 && (
          <div>
            <p className="mb-1.5 text-xs text-muted">Open slots that day (or type any time above):</p>
            <div className="no-scrollbar flex gap-1.5 overflow-x-auto pb-1">
              {slots.map((s) => (
                <button key={s} type="button" onClick={() => setTime(shopHm(s))}
                  className={`shrink-0 rounded-lg border px-2.5 py-1.5 text-xs font-semibold ${shopHm(s) === time ? "border-gold bg-gold text-black" : "border-line"}`}>
                  {formatTime(s)}
                </button>
              ))}
            </div>
          </div>
        )}
        <textarea className="input min-h-16" placeholder="Notes (optional)" value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} />
        <Notice msg={msg} tone="error" />
        <button className="btn-primary w-full" disabled={busy}>{busy ? "Booking…" : "Book appointment"}</button>
      </form>
    </Modal>
  );
}
