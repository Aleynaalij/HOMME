import { emailEnabled, sendEmail, templates, type ApptInfo } from "./email";
import { getServerClient } from "./supabase";

type Claimed = ApptInfo & { notify_email: string | null };

/**
 * Send "booked" or "cancelled" emails for an appointment. Safe to call repeatedly:
 * the database hands each event out only once, and only if the appointment's status matches.
 */
export async function notifyAppointment(token: string, event: "booked" | "cancelled") {
  if (!emailEnabled()) return;
  const { data, error } = await getServerClient().rpc("claim_notification", {
    p_secret: process.env.CRON_SECRET,
    p_token: token,
    p_event: event,
  });
  if (error) return console.error("claim_notification", error.message);
  const a = (data as Claimed[] | null)?.[0];
  if (!a) return;

  const owner = a.notify_email;
  const client = event === "booked" ? templates.clientBooked(a) : templates.clientCancelled(a);
  const ownerMsg = event === "booked" ? templates.ownerBooked(a) : templates.ownerCancelled(a);

  await Promise.all([
    sendEmail({ to: a.customer_email, ...client, replyTo: owner ?? undefined }),
    owner ? sendEmail({ to: owner, ...ownerMsg, replyTo: a.customer_email }) : null,
  ]);
}

export async function sendDueReminders() {
  if (!emailEnabled()) return 0;
  const { data, error } = await getServerClient().rpc("claim_due_reminders", { p_secret: process.env.CRON_SECRET });
  if (error) {
    console.error("claim_due_reminders", error.message);
    return 0;
  }
  const rows = (data as ApptInfo[] | null) ?? [];
  await Promise.all(rows.map((a) => sendEmail({ to: a.customer_email, ...templates.clientReminder(a) })));
  return rows.length;
}
