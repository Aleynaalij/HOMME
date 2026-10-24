"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { getBrowserClient } from "@/lib/supabase";
import { brand, mapsLink } from "@/lib/config";
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

  const totalMin = appt.services.reduce((a, s) => a + s.duration_min, 0);
  const cancelled = appt.status === "cancelled";
  const headline = cancelled
    ? "Appointment cancelled"
    : justPaid
      ? "Paid & confirmed"
      : appt.status === "pending_payment"
        ? "Almost there"
        : isNew
          ? "You're booked!"
          : "Your appointment";

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
    <div className="grain min-h-dvh">
      <header className="mx-auto flex h-16 max-w-xl items-center justify-center px-5">
        <Logo className="h-6 w-auto" />
      </header>
      <main className="mx-auto max-w-xl px-5 pb-16 pt-6">
        <div className="text-center">
          {!cancelled && (
            <div className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-full bg-gold text-black">
              <CheckIcon className="h-7 w-7" />
            </div>
          )}
          <h1 className="font-display text-4xl font-bold">{headline}</h1>
          {isNew && !cancelled && <p className="mt-3 text-muted">Bookmark this page — you can view, add to calendar or cancel from here.</p>}
        </div>

        {paymentCanceled && appt.payment_status !== "paid" && (
          <div className="mt-6 rounded-xl border border-gold/40 bg-gold/10 px-4 py-3 text-sm text-gold-soft">
            Payment wasn&apos;t completed. Your slot is held for 30 minutes — pay below or choose to pay at the shop by rebooking.
          </div>
        )}
        {msg && <div className="mt-6 rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">{msg}</div>}

        <div className="card mt-8 p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="eyebrow">{STATUS_LABEL[appt.status]}</p>
              <p className="mt-2 text-xl font-semibold">{formatDateLong(appt.starts_at)}</p>
              <p className="text-muted">{formatTime(appt.starts_at)} – {formatTime(appt.ends_at)} · {duration(totalMin)}</p>
            </div>
          </div>
          <ul className="mt-5 space-y-1.5 border-t border-line pt-5 text-sm">
            {appt.services.map((s) => (
              <li key={s.id} className="flex justify-between">
                <span>{s.name}</span>
                <span className="text-muted">{s.price_is_starting ? "from " : ""}{money(s.price_cents)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex justify-between border-t border-line pt-4 font-semibold">
            <span>Total</span>
            <span>
              {money(appt.amount_cents)}{" "}
              <span className="ml-1 rounded-full bg-surface-2 px-2 py-0.5 text-xs font-medium text-muted">
                {appt.payment_status === "paid" ? "Paid" : appt.payment_method === "card" ? "Unpaid" : "Pay at shop"}
              </span>
            </span>
          </div>
          <div className="mt-5 flex items-start gap-2 border-t border-line pt-5 text-sm text-muted">
            <PinIcon className="mt-0.5 h-4 w-4 shrink-0" />
            <a href={mapsLink} target="_blank" rel="noopener noreferrer" className="hover:text-fg">
              {brand.suite}<br />{brand.address.join(", ")}
            </a>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3">
          {appt.status === "pending_payment" && cardEnabled && (
            <button onClick={pay} disabled={busy} className="btn-primary">Pay {money(appt.amount_cents)} now</button>
          )}
          {!cancelled && appt.status !== "completed" && (
            <a href={`/api/ics/${token}`} className="btn-ghost">Add to calendar</a>
          )}
          {appt.can_cancel && (
            <button onClick={cancel} disabled={busy} className="btn-ghost !border-danger/40 !text-danger">Cancel appointment</button>
          )}
          {cancelled && <Link href="/book" className="btn-primary">Book again</Link>}
        </div>

        {appt.status === "completed" && (
          <div className="card mt-8 p-6">
            {reviewed ? (
              <p className="text-center text-muted">Thanks for your review! 🙏</p>
            ) : (
              <form onSubmit={review}>
                <h2 className="font-display text-2xl font-bold">How was your cut?</h2>
                <div className="mt-4 flex gap-1">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <button key={i} type="button" onClick={() => setRating(i)} aria-label={`${i} stars`} className={i <= rating ? "text-gold" : "text-line"}>
                      <StarIcon className="h-8 w-8" />
                    </button>
                  ))}
                </div>
                <textarea className="input mt-4 min-h-24" placeholder="Tell others about your experience (optional)" maxLength={1000}
                  value={body} onChange={(e) => setBody(e.target.value)} />
                <button className="btn-primary mt-4 w-full" disabled={busy}>Submit review</button>
              </form>
            )}
          </div>
        )}

        <p className="mt-10 text-center text-sm text-muted">
          <Link href="/" className="hover:text-fg">← Back to HOMME</Link>
        </p>
      </main>
    </div>
  );
}
