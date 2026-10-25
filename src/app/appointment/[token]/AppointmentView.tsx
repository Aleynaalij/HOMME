"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getBrowserClient } from "@/lib/supabase";
import { brand, mapsLink } from "@/lib/config";
import { rememberAppointment } from "@/lib/myAppointments";
import type { PublicAppointment } from "@/lib/types";
import { duration, formatDateLong, formatTime, money } from "@/lib/format";
import { Logo } from "@/components/Logo";
import { CheckIcon, PinIcon, StarIcon } from "@/components/icons";

const STATUS_LABEL: Record<PublicAppointment["status"], string> = {
  pending_payment: "Awaiting payment",
  confirmed: "Confirmed",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "Missed",
};

export function AppointmentView({
  token,
  appt,
  isNew,
  justPaid,
  paymentCanceled,
  cardEnabled,
}: {
  token: string;
  appt: PublicAppointment;
  isNew: boolean;
  justPaid: boolean;
  paymentCanceled: boolean;
  cardEnabled: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [rating, setRating] = useState(5);
  const [body, setBody] = useState("");
  const [reviewed, setReviewed] = useState(appt.has_review);

  // Remember this booking on the device so the home page can say "welcome back"
  useEffect(() => rememberAppointment(token), [token]);

  const totalMin = appt.services.reduce((a, s) => a + s.duration_min, 0);
  const cancelled = appt.status === "cancelled";
  const completed = appt.status === "completed";
  const first = appt.customer_name.split(/\s+/)[0];
  const again = `/book?services=${appt.services.map((s) => s.id).join(",")}`;

  const [headline, accent] = cancelled
    ? ["Appointment", "cancelled."]
    : completed
      ? [`Thanks, ${first}.`, "Looking sharp."]
      : justPaid
        ? ["Paid &", "confirmed."]
        : appt.status === "pending_payment"
          ? ["Almost", "there."]
          : isNew
            ? ["You're", "booked."]
            : ["See you", "soon."];

  async function cancel() {
    if (!confirm("Cancel this appointment?")) return;
    setBusy(true);
    const { data } = await getBrowserClient().rpc("cancel_appointment_by_token", { p_token: token });
    setBusy(false);
    if (data) router.refresh();
    else setMsg("This appointment can no longer be cancelled online. Please message Tash directly.");
  }

  async function pay() {
    setBusy(true);
    const res = await fetch("/api/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }) });
    const json = await res.json().catch(() => ({}));
    if (json.url) window.location.href = json.url;
    else {
      setBusy(false);
      setMsg(json.error ?? "Couldn't start checkout.");
    }
  }

  async function review(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await getBrowserClient().rpc("submit_review", { p_token: token, p_rating: rating, p_body: body });
    setBusy(false);
    if (error) setMsg(error.message);
    else setReviewed(true);
  }

  return (
    <div className="relative min-h-dvh overflow-x-clip">
      <div aria-hidden className="pointer-events-none absolute left-1/2 top-[-25%] h-[60vh] w-[120vw] -translate-x-1/2 rounded-[100%] bg-[radial-gradient(closest-side,rgba(201,169,106,0.18),transparent)]" />
      <header className="relative mx-auto flex h-[4.5rem] max-w-xl items-center justify-center px-5">
        <Logo className="h-6 w-auto" />
      </header>

      <main className="relative mx-auto max-w-xl px-5 pb-20 pt-6">
        <div className="float-in text-center">
          {!cancelled && (
            <div className="mx-auto mb-6 grid h-14 w-14 place-items-center rounded-full bg-gradient-to-br from-gold-soft to-gold-deep text-black shadow-[0_10px_40px_-10px_rgba(201,169,106,0.7)]">
              <CheckIcon className="h-6 w-6" />
            </div>
          )}
          <h1 className="font-display text-5xl leading-tight text-ivory">
            {headline} <em className="text-gold-gradient italic">{accent}</em>
          </h1>
          {isNew && !cancelled && (
            <p className="mt-4 text-muted">We saved this to your phone — come back anytime to view, add to calendar or cancel.</p>
          )}
        </div>

        {paymentCanceled && appt.payment_status !== "paid" && (
          <div className="mt-6 rounded-2xl border border-gold/30 bg-gold/10 px-4 py-3 text-sm text-gold-soft">
            Payment wasn&apos;t completed. Your slot is held for 30 minutes — pay below, or book again and choose pay at the shop.
          </div>
        )}
        {msg && <div className="mt-6 rounded-2xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">{msg}</div>}

        {/* Ticket */}
        <div className="float-in relative mt-10 overflow-hidden rounded-[1.75rem] border border-white/10 bg-gradient-to-b from-white/[0.05] to-white/[0.015]" style={{ animationDelay: "120ms" }}>
          <div className="p-7">
            <div className="flex items-center justify-between">
              <span className={`text-[0.6rem] font-semibold uppercase tracking-[0.35em] ${cancelled ? "text-danger" : "text-gold"}`}>{STATUS_LABEL[appt.status]}</span>
              <span className="text-[0.6rem] font-semibold uppercase tracking-[0.35em] text-muted">with {brand.barber}</span>
            </div>
            <p className={`mt-5 font-display text-3xl text-ivory ${cancelled ? "line-through decoration-1 opacity-60" : ""}`}>{formatDateLong(appt.starts_at)}</p>
            <p className="mt-1 text-lg text-muted">{formatTime(appt.starts_at)} – {formatTime(appt.ends_at)} · {duration(totalMin)}</p>
          </div>

          {/* perforation */}
          <div className="relative flex items-center">
            <span className="absolute -left-3 h-6 w-6 rounded-full bg-bg" />
            <span className="mx-5 h-px flex-1 border-t border-dashed border-white/15" />
            <span className="absolute -right-3 h-6 w-6 rounded-full bg-bg" />
          </div>

          <div className="p-7">
            <ul className="space-y-2.5">
              {appt.services.map((s) => (
                <li key={s.id} className="flex items-baseline">
                  <span className="font-display text-lg text-ivory">{s.name}</span>
                  <span className="leader" />
                  <span className="text-muted">{s.price_is_starting ? "from " : ""}{money(s.price_cents)}</span>
                </li>
              ))}
            </ul>
            <div className="mt-5 flex items-baseline justify-between border-t border-white/8 pt-5">
              <span className="text-[0.62rem] font-semibold uppercase tracking-[0.3em] text-muted">Total</span>
              <span className="font-display text-2xl text-ivory">
                {money(appt.amount_cents)}
                <span className="ml-2 rounded-full border border-white/10 px-2.5 py-0.5 align-middle font-sans text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-muted">
                  {appt.payment_status === "paid" ? "Paid" : appt.payment_method === "card" ? "Unpaid" : "Pay at shop"}
                </span>
              </span>
            </div>
            <a href={mapsLink} target="_blank" rel="noopener noreferrer" className="mt-6 flex items-start gap-3 rounded-2xl bg-white/[0.03] p-4 text-sm text-muted transition hover:text-ivory">
              <PinIcon className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
              <span><span className="block text-ivory">{brand.suite}</span>{brand.address.join(", ")}</span>
            </a>
          </div>
        </div>

        <div className="mt-6 grid gap-3">
          {appt.status === "pending_payment" && cardEnabled && (
            <button onClick={pay} disabled={busy} className="btn-gold">Pay {money(appt.amount_cents)} now</button>
          )}
          {!cancelled && !completed && (
            <div className="grid grid-cols-2 gap-3">
              <a href={`/api/ics/${token}`} className="btn-line whitespace-nowrap !px-3">Add to calendar</a>
              <a href={mapsLink} target="_blank" rel="noopener noreferrer" className="btn-line whitespace-nowrap !px-3">Directions</a>
            </div>
          )}
          {(cancelled || completed) && <Link href={again} className="btn-gold">Book again</Link>}
          {appt.can_cancel && (
            <button onClick={cancel} disabled={busy} className="mt-2 text-sm text-muted underline-offset-4 hover:text-danger hover:underline">Cancel appointment</button>
          )}
        </div>

        {completed && (
          <div className="lux-card mt-8 p-7">
            {reviewed ? (
              <p className="text-center font-display text-2xl text-ivory">Thank you for the review. <em className="text-gold-gradient italic">It means everything.</em></p>
            ) : (
              <form onSubmit={review}>
                <h2 className="font-display text-3xl text-ivory">How was your <em className="text-gold-gradient italic">cut?</em></h2>
                <div className="mt-5 flex gap-1.5">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <button key={i} type="button" onClick={() => setRating(i)} aria-label={`${i} stars`}
                      className={`transition ${i <= rating ? "scale-100 text-gold" : "scale-90 text-white/15"}`}>
                      <StarIcon className="h-9 w-9" />
                    </button>
                  ))}
                </div>
                <textarea className="input mt-5 min-h-28" placeholder="Tell others about your experience (optional)" maxLength={1000}
                  value={body} onChange={(e) => setBody(e.target.value)} />
                <button className="btn-gold mt-4 w-full" disabled={busy}>Share review</button>
              </form>
            )}
          </div>
        )}

        <p className="mt-12 text-center">
          <Link href="/" className="text-[0.65rem] font-semibold uppercase tracking-[0.35em] text-muted hover:text-ivory">← Back to HOMME</Link>
        </p>
      </main>
    </div>
  );
}
