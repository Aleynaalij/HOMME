import { brand, mapsLink, siteUrl } from "./config";
import { duration, formatDateLong, formatTime, money } from "./format";
import type { ServiceSnapshot } from "./types";

const FROM = process.env.EMAIL_FROM || "HOMME <onboarding@resend.dev>";

export function emailEnabled() {
  return Boolean(process.env.RESEND_API_KEY && process.env.CRON_SECRET);
}

export async function sendEmail(opts: { to: string; subject: string; html: string; replyTo?: string }) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM, to: [opts.to], subject: opts.subject, html: opts.html, reply_to: opts.replyTo }),
  });
  if (!res.ok) console.error("Resend error", res.status, await res.text().catch(() => ""));
}

export type ApptInfo = {
  manage_token: string;
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  notes?: string | null;
  services: ServiceSnapshot[];
  starts_at: string;
  ends_at: string;
  amount_cents: number;
  payment_method?: string;
  payment_status: string;
};

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const when = (a: ApptInfo) => `${formatDateLong(a.starts_at)} at ${formatTime(a.starts_at)}`;
const serviceNames = (a: ApptInfo) => a.services.map((s) => s.name).join(" + ");
const totalMin = (a: ApptInfo) => a.services.reduce((n, s) => n + s.duration_min, 0);
const firstName = (a: ApptInfo) => esc(a.customer_name.split(/\s+/)[0] ?? a.customer_name);
const paid = (a: ApptInfo) => (a.payment_status === "paid" ? "Paid" : "Pay at shop");

function layout(title: string, body: string) {
  return `<!doctype html><html><body style="margin:0;background:#050505;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#f5f3ef">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#050505;padding:32px 16px"><tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px">
<tr><td align="center" style="padding-bottom:24px"><img src="${siteUrl}/brand/homme-logo.png" alt="HOMME" width="180" style="display:block;width:180px;height:auto"></td></tr>
<tr><td style="background:#111111;border:1px solid #262626;border-radius:16px;padding:28px">
<h1 style="margin:0 0 16px;font-family:Georgia,serif;font-size:26px;color:#f5f3ef">${title}</h1>
${body}
</td></tr>
<tr><td align="center" style="padding-top:20px;font-size:12px;color:#9a9690">${esc(brand.legalName)} · ${esc(brand.address.join(", "))}</td></tr>
</table></td></tr></table></body></html>`;
}

function details(a: ApptInfo, extra: [string, string][] = []) {
  const rows: [string, string][] = [
    ["When", when(a)],
    ["Service", serviceNames(a)],
    ["Length", duration(totalMin(a))],
    ["Total", `${money(a.amount_cents)} · ${paid(a)}`],
    ...extra,
  ];
  return `<table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;margin:8px 0 20px">${rows
    .map(
      ([k, v]) =>
        `<tr><td style="padding:6px 0;color:#9a9690;width:90px;vertical-align:top">${k}</td><td style="padding:6px 0;color:#f5f3ef">${esc(v)}</td></tr>`,
    )
    .join("")}</table>`;
}

const button = (href: string, label: string) =>
  `<a href="${href}" style="display:inline-block;background:#f5f3ef;color:#000;text-decoration:none;font-weight:700;font-size:13px;letter-spacing:2px;text-transform:uppercase;padding:14px 22px;border-radius:999px">${label}</a>`;

const manage = (a: ApptInfo) => `${siteUrl}/appointment/${a.manage_token}`;
const directions = `<p style="font-size:14px;color:#9a9690;margin:20px 0 0">📍 <a href="${mapsLink}" style="color:#c9a96a">${esc(brand.suite)}, ${esc(brand.address.join(", "))}</a></p>`;

export const templates = {
  clientBooked: (a: ApptInfo) => ({
    subject: `You're booked with ${brand.barber} — ${formatDateLong(a.starts_at)}, ${formatTime(a.starts_at)}`,
    html: layout(
      "You're booked!",
      `<p style="font-size:15px;line-height:1.6;margin:0 0 8px">Hi ${firstName(a)}, your appointment with ${brand.barber} is confirmed.</p>
${details(a)}${button(manage(a), "View or cancel")}${directions}`,
    ),
  }),
  ownerBooked: (a: ApptInfo) => ({
    subject: `New booking: ${a.customer_name} — ${formatDateLong(a.starts_at)}, ${formatTime(a.starts_at)}`,
    html: layout(
      "New booking 💈",
      `${details(a, [
        ["Client", a.customer_name],
        ["Phone", a.customer_phone ?? ""],
        ["Email", a.customer_email],
        ...(a.notes ? ([["Notes", a.notes]] as [string, string][]) : []),
      ])}${button(`${siteUrl}/admin`, "Open dashboard")}`,
    ),
  }),
  clientCancelled: (a: ApptInfo) => ({
    subject: `Appointment cancelled — ${formatDateLong(a.starts_at)}`,
    html: layout(
      "Appointment cancelled",
      `<p style="font-size:15px;line-height:1.6;margin:0 0 8px">Hi ${firstName(a)}, your appointment on ${esc(when(a))} has been cancelled.</p>
${details(a)}${button(`${siteUrl}/book`, "Book a new time")}`,
    ),
  }),
  ownerCancelled: (a: ApptInfo) => ({
    subject: `Cancelled: ${a.customer_name} — ${formatDateLong(a.starts_at)}, ${formatTime(a.starts_at)}`,
    html: layout(
      "Booking cancelled",
      `<p style="font-size:15px;line-height:1.6;margin:0 0 8px">This time slot is open again.</p>
${details(a, [["Client", a.customer_name], ["Phone", a.customer_phone ?? ""]])}${button(`${siteUrl}/admin`, "Open dashboard")}`,
    ),
  }),
  clientReminder: (a: ApptInfo) => ({
    subject: `Reminder: your cut with ${brand.barber} is tomorrow at ${formatTime(a.starts_at)}`,
    html: layout(
      "See you tomorrow",
      `<p style="font-size:15px;line-height:1.6;margin:0 0 8px">Hi ${firstName(a)}, just a reminder about your appointment tomorrow.</p>
${details(a)}${button(manage(a), "View or cancel")}${directions}`,
    ),
  }),
};
