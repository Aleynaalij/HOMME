import { siteUrl } from "./config";
import { emailEnabled, sendEmail, templates, type ApptInfo } from "./email";
import { getServerClient } from "./supabase";

type Claimed = ApptInfo & { notify_email: string | null };
export type NotifyEvent = "booked" | "cancelled" | "completed";

const secret = () => process.env.CRON_SECRET;

/**
 * Emails for an appointment event. Safe to call repeatedly: the database hands each event out once,
 * and only when the appointment's status actually matches.
 */
export async function notifyAppointment(token: string, event: NotifyEvent) {
  if (!emailEnabled()) return;
  const db = getServerClient();

  if (event === "completed") {
    const { data } = await db.rpc("claim_review_request", { p_secret: secret(), p_token: token });
    const a = (data as ApptInfo[] | null)?.[0];
    if (a) await sendEmail({ to: a.customer_email, ...templates.reviewRequest(a) });
    return;
  }

  const { data, error } = await db.rpc("claim_notification", { p_secret: secret(), p_token: token, p_event: event });
  if (error) return console.error("claim_notification", error.message);
  const a = (data as Claimed[] | null)?.[0];
  if (!a) return;
  const owner = a.notify_email;

  if (event === "booked") {
    await Promise.all([
      a.customer_email ? sendEmail({ to: a.customer_email, ...templates.clientBooked(a), replyTo: owner ?? undefined }) : null,
      owner ? sendEmail({ to: owner, ...templates.ownerBooked(a), replyTo: a.customer_email || undefined }) : null,
    ]);
    return;
  }

  // Cancelled: tell the waitlist first, then the client and Tash.
  const { data: waiting } = await db.rpc("claim_waitlist_for_opening", { p_secret: secret(), p_token: token });
  const wl = (waiting as { name: string; email: string; opening: string }[] | null) ?? [];
  await Promise.all([
    ...wl.map((w) => sendEmail({ to: w.email, ...templates.waitlistOpening(w.name, w.opening), replyTo: owner ?? undefined })),
    a.customer_email ? sendEmail({ to: a.customer_email, ...templates.clientCancelled(a), replyTo: owner ?? undefined }) : null,
    owner ? sendEmail({ to: owner, ...templates.ownerCancelled(a, wl.length), replyTo: a.customer_email || undefined }) : null,
  ]);
}

/** Daily job: day-before reminders, review requests that slipped through, and rebooking nudges. */
export async function runDailyJobs() {
  if (!emailEnabled()) return { reminders: 0, reviews: 0, rebooks: 0 };
  const db = getServerClient();
  const [rem, rev, reb] = await Promise.all([
    db.rpc("claim_due_reminders", { p_secret: secret() }),
    db.rpc("claim_due_review_requests", { p_secret: secret() }),
    db.rpc("claim_rebook_reminders", { p_secret: secret() }),
  ]);
  const reminders = (rem.data as ApptInfo[] | null) ?? [];
  const reviews = (rev.data as ApptInfo[] | null) ?? [];
  const rebooks = (reb.data as { name: string; email: string; unsubscribe_token: string }[] | null) ?? [];
  await Promise.all([
    ...reminders.map((a) => sendEmail({ to: a.customer_email, ...templates.clientReminder(a) })),
    ...reviews.map((a) => sendEmail({ to: a.customer_email, ...templates.reviewRequest(a) })),
    ...rebooks.map((c) => sendEmail({ to: c.email, ...templates.rebookReminder(c.name, `${siteUrl}/unsubscribe/${c.unsubscribe_token}`) })),
  ]);
  return { reminders: reminders.length, reviews: reviews.length, rebooks: rebooks.length };
}
