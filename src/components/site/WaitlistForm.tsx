"use client";

import { useState } from "react";
import { getBrowserClient } from "@/lib/supabase";
import { addDays, shopNow } from "@/lib/format";

/** Join the waitlist from anywhere on the site. */
export function WaitlistForm({ defaultDate, serviceNames, compact = false }: { defaultDate?: string; serviceNames?: string; compact?: boolean }) {
  const [f, setF] = useState({ name: "", phone: "", email: "", date: defaultDate ?? "", anyDay: !defaultDate });
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");
  const [error, setError] = useState<string | null>(null);
  const today = shopNow().ymd;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("busy");
    setError(null);
    const { error } = await getBrowserClient().rpc("join_waitlist", {
      p_name: f.name, p_phone: f.phone, p_email: f.email,
      p_date: f.anyDay || !f.date ? null : f.date, p_service_names: serviceNames ?? null,
    });
    if (error) {
      setState("idle");
      setError(error.message);
    } else setState("done");
  }

  if (state === "done") {
    return (
      <div className="float-in text-center">
        <p className="font-display text-3xl text-ivory">You&apos;re on the list.</p>
        <p className="mt-2 text-muted">The moment a chair opens up, you&apos;ll hear first. Keep an eye on your inbox.</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className={`grid gap-3 ${compact ? "" : "sm:grid-cols-3"}`}>
        <input className="input" required placeholder="Full name" maxLength={120} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        <input className="input" type="email" placeholder="Email (instant alerts)" maxLength={200} value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
        <input className="input" type="tel" placeholder="Phone" maxLength={40} value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm text-muted">
          <input type="checkbox" className="h-4 w-4 accent-[var(--gold)]" checked={f.anyDay} onChange={(e) => setF({ ...f, anyDay: e.target.checked })} />
          Any day works
        </label>
        {!f.anyDay && (
          <input type="date" className="input !w-auto !py-2" min={today} max={addDays(today, 60)} value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} required />
        )}
        <button className="btn-gold ml-auto w-full sm:w-auto" disabled={state === "busy"}>{state === "busy" ? "Joining…" : "Join the waitlist"}</button>
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
    </form>
  );
}
