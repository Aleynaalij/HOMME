"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { getBrowserClient } from "@/lib/supabase";
import type { BusinessHours, Service } from "@/lib/types";
import { addDays, duration, formatDateLong, formatTime, money, shopNow, ymdWeekday } from "@/lib/format";
import { Logo } from "@/components/Logo";
import { ArrowLeftIcon, CheckIcon, ClockIcon } from "@/components/icons";

type Step = "services" | "time" | "details";
const DAYS_AHEAD = 60;

export function BookingFlow({
  services,
  hours,
  initialServiceId,
  cardEnabled,
  waitlistEnabled,
}: {
  services: Service[];
  hours: BusinessHours[];
  initialServiceId?: string;
  cardEnabled: boolean;
  waitlistEnabled: boolean;
}) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("services");
  const [selected, setSelected] = useState<string[]>(
    initialServiceId && services.some((s) => s.id === initialServiceId) ? [initialServiceId] : [],
  );
  const [date, setDate] = useState<string | null>(null);
  const [slots, setSlots] = useState<string[] | null>(null);
  const [slot, setSlot] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", email: "", phone: "", notes: "" });
  const [payment, setPayment] = useState<"in_shop" | "card">("in_shop");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);

  const main = services.filter((s) => !s.is_addon);
  const addons = services.filter((s) => s.is_addon);
  const chosen = services.filter((s) => selected.includes(s.id));
  const totalMin = chosen.reduce((a, s) => a + s.duration_min, 0);
  const totalCents = chosen.reduce((a, s) => a + s.price_cents, 0);
  const hasStarting = chosen.some((s) => s.price_is_starting);

  const openDays = useMemo(() => new Set(hours.filter((h) => h.is_open).map((h) => h.weekday)), [hours]);
  const days = useMemo(() => {
    const today = shopNow().ymd;
    return Array.from({ length: DAYS_AHEAD }, (_, i) => addDays(today, i));
  }, []);

  // Pick the first open day once services are chosen
  useEffect(() => {
    if (step === "time" && !date) setDate(days.find((d) => openDays.has(ymdWeekday(d))) ?? days[0]);
  }, [step, date, days, openDays]);

  // Load slots whenever date or duration changes
  useEffect(() => {
    if (step !== "time" || !date || !totalMin) return;
    let cancelled = false;
    setSlots(null);
    setSlot(null);
    getBrowserClient()
      .rpc("get_available_slots", { p_date: date, p_duration_min: totalMin })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) setError("Couldn't load times. Please try again.");
        setSlots(((data as string[] | null) ?? []).map((s) => new Date(s).toISOString()));
      });
    return () => {
      cancelled = true;
    };
  }, [step, date, totalMin, reload]);

  function toggle(id: string, isAddon: boolean) {
    setSelected((cur) => {
      if (cur.includes(id)) return cur.filter((x) => x !== id);
      // one main service at a time; add-ons stack
      if (!isAddon) return [...cur.filter((x) => services.find((s) => s.id === x)?.is_addon), id];
      return [...cur, id];
    });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!slot) return;
    setSubmitting(true);
    setError(null);
    const { data: token, error } = await getBrowserClient().rpc("book_appointment", {
      p_service_ids: selected,
      p_starts_at: slot,
      p_name: form.name,
      p_email: form.email,
      p_phone: form.phone,
      p_notes: form.notes || null,
      p_payment_method: payment,
    });
    if (error || !token) {
      setSubmitting(false);
      setError(error?.message ?? "Something went wrong. Please try again.");
      if (error?.message.includes("no longer available")) {
        setStep("time");
        setReload((n) => n + 1);
      }
      return;
    }
    if (payment === "card") {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.url) {
        window.location.href = json.url;
        return;
      }
      // fall through to confirmation page; they can pay from there
    }
    router.push(`/appointment/${token}?new=1`);
  }

  const back = () => setStep(step === "details" ? "time" : "services");

  return (
    <div className="min-h-dvh pb-40">
      <header className="sticky top-0 z-30 border-b border-line/60 bg-bg/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-5">
          {step === "services" ? (
            <Link href="/" className="btn-ghost !p-2.5" aria-label="Back home"><ArrowLeftIcon /></Link>
          ) : (
            <button onClick={back} className="btn-ghost !p-2.5" aria-label="Back"><ArrowLeftIcon /></button>
          )}
          <Logo className="h-6 w-auto" />
          <span className="w-10" />
        </div>
        <div className="mx-auto flex max-w-3xl gap-1.5 px-5 pb-3">
          {(["services", "time", "details"] as Step[]).map((s, i) => (
            <div key={s} className={`h-1 flex-1 rounded-full ${i <= ["services", "time", "details"].indexOf(step) ? "bg-gold" : "bg-line"}`} />
          ))}
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 pt-8">
        {error && <div className="mb-6 rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">{error}</div>}

        {step === "services" && (
          <section>
            <h1 className="font-display text-4xl font-bold">Choose a service</h1>
            <p className="mt-2 text-muted">Pick your cut, then stack any add-ons.</p>
            <div className="mt-8 space-y-2.5">
              {main.map((s) => (
                <ServiceRow key={s.id} s={s} active={selected.includes(s.id)} onClick={() => toggle(s.id, false)} />
              ))}
            </div>
            {addons.length > 0 && (
              <>
                <h2 className="mb-3 mt-10 text-xs font-semibold uppercase tracking-[0.25em] text-muted">Add-ons</h2>
                <div className="space-y-2.5">
                  {addons.map((s) => (
                    <ServiceRow key={s.id} s={s} addon active={selected.includes(s.id)} onClick={() => toggle(s.id, true)} />
                  ))}
                </div>
              </>
            )}
          </section>
        )}

        {step === "time" && date && (
          <section>
            <h1 className="font-display text-4xl font-bold">Pick a time</h1>
            <p className="mt-2 text-muted">{chosen.map((s) => s.name).join(" + ")} · {duration(totalMin)}</p>

            <div className="no-scrollbar -mx-5 mt-8 flex gap-2 overflow-x-auto px-5 pb-2">
              {days.map((d) => {
                const dt = new Date(`${d}T12:00:00Z`);
                const open = openDays.has(ymdWeekday(d));
                const active = d === date;
                return (
                  <button
                    key={d}
                    disabled={!open}
                    onClick={() => setDate(d)}
                    className={`flex w-16 shrink-0 flex-col items-center rounded-2xl border py-3 transition ${
                      active ? "border-fg bg-fg text-black" : open ? "border-line bg-surface hover:border-muted" : "border-transparent text-muted/40"
                    }`}
                  >
                    <span className="text-[0.65rem] font-semibold uppercase tracking-widest">{dt.toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" })}</span>
                    <span className="mt-1 text-xl font-bold">{dt.getUTCDate()}</span>
                    <span className="text-[0.65rem]">{dt.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" })}</span>
                  </button>
                );
              })}
            </div>

            <h2 className="mt-8 text-sm font-semibold text-muted">{formatDateLong(`${date}T12:00:00Z`)}</h2>
            <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4">
              {slots === null &&
                Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-12 animate-pulse rounded-xl bg-surface" />)}
              {slots?.map((s) => (
                <button
                  key={s}
                  onClick={() => setSlot(s)}
                  className={`h-12 rounded-xl border text-sm font-semibold transition ${
                    slot === s ? "border-gold bg-gold text-black" : "border-line bg-surface hover:border-muted"
                  }`}
                >
                  {formatTime(s)}
                </button>
              ))}
            </div>
            {slots?.length === 0 && (
              <div className="card mt-2 p-6 text-center text-muted">
                Fully booked this day{waitlistEnabled ? " — join the waitlist and you'll hear first if a spot opens." : " — try another date."}
              </div>
            )}
            {waitlistEnabled && slots !== null && (
              <JoinWaitlist date={date} serviceNames={chosen.map((s) => s.name).join(" + ")} prominent={slots.length === 0} />
            )}
          </section>
        )}

        {step === "details" && slot && (
          <form id="details" onSubmit={submit}>
            <h1 className="font-display text-4xl font-bold">Your details</h1>
            <div className="card mt-6 p-5">
              <p className="font-semibold">{formatDateLong(slot)} · {formatTime(slot)}</p>
              <ul className="mt-3 space-y-1 text-sm text-muted">
                {chosen.map((s) => (
                  <li key={s.id} className="flex justify-between">
                    <span>{s.name}</span>
                    <span>{s.price_is_starting ? "from " : ""}{money(s.price_cents)}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-3 flex justify-between border-t border-line pt-3 font-semibold">
                <span>Total{hasStarting ? " (starting at)" : ""}</span>
                <span>{money(totalCents)}</span>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              <input className="input" required placeholder="Full name" autoComplete="name" maxLength={120}
                value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <input className="input" required type="email" placeholder="Email" autoComplete="email" maxLength={200}
                value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              <input className="input" required type="tel" placeholder="Phone" autoComplete="tel" maxLength={40}
                value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              <textarea className="input min-h-24" placeholder="Anything Tash should know? (optional)" maxLength={1000}
                value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>

            <h2 className="mb-3 mt-8 text-xs font-semibold uppercase tracking-[0.25em] text-muted">Payment</h2>
            <div className="grid gap-2.5 sm:grid-cols-2">
              <PayOption active={payment === "in_shop"} onClick={() => setPayment("in_shop")} title="Pay at the shop" sub="Cash, card or app on arrival" />
              <PayOption
                active={payment === "card"}
                disabled={!cardEnabled}
                onClick={() => setPayment("card")}
                title="Pay now with card"
                sub={cardEnabled ? "Secure checkout via Stripe" : "Coming soon"}
              />
            </div>
          </form>
        )}
      </main>

      {/* Bottom action bar */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-bg/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-5 py-4">
          <div className="min-w-0">
            {chosen.length ? (
              <>
                <p className="font-semibold">{hasStarting ? "from " : ""}{money(totalCents)}</p>
                <p className="flex items-center gap-1 text-xs text-muted"><ClockIcon className="h-3 w-3" /> {duration(totalMin)}{slot && step !== "services" ? ` · ${formatTime(slot)}` : ""}</p>
              </>
            ) : (
              <p className="text-sm text-muted">Select a service</p>
            )}
          </div>
          {step === "services" && (
            <button className="btn-primary" disabled={chosen.length === 0} onClick={() => setStep("time")}>Continue</button>
          )}
          {step === "time" && (
            <button className="btn-primary" disabled={!slot} onClick={() => setStep("details")}>Continue</button>
          )}
          {step === "details" && (
            <button className="btn-primary" form="details" type="submit" disabled={submitting}>
              {submitting ? "Booking…" : payment === "card" ? "Continue to payment" : "Confirm booking"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ServiceRow({ s, active, addon, onClick }: { s: Service; active: boolean; addon?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center justify-between rounded-2xl border p-5 text-left transition ${
        active ? "border-gold bg-gold/[0.07]" : "border-line bg-surface hover:border-muted"
      }`}
    >
      <span>
        <span className="block font-semibold">{s.name}</span>
        <span className="mt-1 block text-sm text-muted">
          {addon && !s.price_is_starting ? "+" : ""}{s.price_is_starting ? "from " : ""}{money(s.price_cents)} · {duration(s.duration_min)}
        </span>
      </span>
      <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border ${active ? "border-gold bg-gold text-black" : "border-line"}`}>
        {active && <CheckIcon className="h-3.5 w-3.5" />}
      </span>
    </button>
  );
}

function PayOption({ active, disabled, onClick, title, sub }: { active: boolean; disabled?: boolean; onClick: () => void; title: string; sub: string }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`rounded-2xl border p-4 text-left transition disabled:opacity-40 ${active ? "border-gold bg-gold/[0.07]" : "border-line bg-surface hover:border-muted"}`}
    >
      <span className="block font-semibold">{title}</span>
      <span className="block text-sm text-muted">{sub}</span>
    </button>
  );
}

function JoinWaitlist({ date, serviceNames, prominent }: { date: string; serviceNames: string; prominent: boolean }) {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ name: "", phone: "", email: "", anyDay: false });
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setState("idle");
    setOpen(false);
  }, [date]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("busy");
    setError(null);
    const { error } = await getBrowserClient().rpc("join_waitlist", {
      p_name: f.name, p_phone: f.phone, p_email: f.email, p_date: f.anyDay ? null : date, p_service_names: serviceNames,
    });
    if (error) {
      setState("idle");
      setError(error.message);
    } else setState("done");
  }

  if (state === "done") {
    return (
      <div className="card mt-4 p-5 text-center">
        <p className="font-semibold">You&apos;re on the waitlist ✓</p>
        <p className="mt-1 text-sm text-muted">If a spot opens{f.anyDay ? "" : ` on ${formatDateLong(`${date}T12:00:00Z`)}`}, you&apos;ll be the first to know.</p>
      </div>
    );
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className={`${prominent ? "btn-primary mt-4 w-full" : "mt-5 w-full text-center text-sm text-muted underline-offset-4 hover:text-fg hover:underline"}`}>
        {prominent ? "Join the waitlist" : "Can’t find a time that works? Join the waitlist"}
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="card mt-4 space-y-3 p-5">
      <p className="font-semibold">Join the waitlist</p>
      <p className="text-sm text-muted">We&apos;ll email you the moment a spot opens. First to book gets it.</p>
      <input className="input" required placeholder="Full name" maxLength={120} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
      <input className="input" type="email" placeholder="Email (for instant alerts)" maxLength={200} value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
      <input className="input" type="tel" placeholder="Phone" maxLength={40} value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
      <label className="flex items-center gap-2 text-sm text-muted">
        <input type="checkbox" className="h-4 w-4 accent-[var(--gold)]" checked={f.anyDay} onChange={(e) => setF({ ...f, anyDay: e.target.checked })} />
        Any day works for me
      </label>
      {error && <p className="text-sm text-danger">{error}</p>}
      <button className="btn-primary w-full" disabled={state === "busy"}>{state === "busy" ? "Joining…" : "Join waitlist"}</button>
    </form>
  );
}
