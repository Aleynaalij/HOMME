import { NextResponse } from "next/server";
import { adminClientFromRequest } from "@/lib/adminAuth";
import { siteUrl } from "@/lib/config";
import { announcementEmail, sendBatch } from "@/lib/email";

type Body = { subject?: string; message?: string; clientIds?: string[]; audience?: string };

export async function POST(req: Request) {
  const db = await adminClientFromRequest(req);
  if (!db) return NextResponse.json({ error: "Not signed in as the owner" }, { status: 401 });
  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: "Email isn't set up yet — add RESEND_API_KEY in Vercel." }, { status: 503 });
  }

  const { subject, message, clientIds, audience }: Body = await req.json().catch(() => ({}));
  if (!subject?.trim() || !message?.trim() || !Array.isArray(clientIds) || clientIds.length === 0) {
    return NextResponse.json({ error: "Subject, message and recipients are required" }, { status: 400 });
  }
  if (clientIds.length > 5000) return NextResponse.json({ error: "Too many recipients" }, { status: 400 });

  const [{ data: clients }, { data: settings }] = await Promise.all([
    db.from("clients").select("name, email, unsubscribe_token").in("id", clientIds).eq("email_opt_out", false).not("email", "is", null),
    db.from("settings").select("notify_email").eq("id", 1).single(),
  ]);
  const replyTo = (settings?.notify_email as string | null) ?? undefined;

  const emails = (clients ?? []).map((c) => {
    const unsub = `${siteUrl}/unsubscribe/${c.unsubscribe_token}`;
    return {
      to: c.email as string,
      subject: subject.trim(),
      html: announcementEmail(String(c.name).split(/\s+/)[0] || "there", subject.trim(), message.trim(), unsub),
      replyTo,
      headers: { "List-Unsubscribe": `<${unsub}>` },
    };
  });

  const sent = await sendBatch(emails);
  await db.from("broadcasts").insert({ channel: "email", subject: subject.trim(), message: message.trim(), audience, recipient_count: sent });
  return NextResponse.json({ sent, skipped: clientIds.length - emails.length });
}
