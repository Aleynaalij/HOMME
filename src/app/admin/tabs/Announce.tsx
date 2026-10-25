"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { prettyPhone, smsLink } from "@/lib/contacts";
import { siteUrl } from "@/lib/config";
import { formatDateShort } from "@/lib/format";
import { matchesFilter } from "./Clients";
import { Notice, sb, type Client } from "../shared";

type Audience = "all" | "regulars" | "lapsed" | "new" | "never";
type Broadcast = { id: string; channel: string; subject: string | null; message: string; audience: string | null; recipient_count: number; created_at: string };

const AUDIENCES: { id: Audience; label: string }[] = [
  { id: "all", label: "Everyone" },
  { id: "regulars", label: "Regulars" },
  { id: "lapsed", label: "Haven't been in 60+ days" },
  { id: "new", label: "New this month" },
  { id: "never", label: "Never booked" },
];

const TEMPLATES = [
  { label: "Openings", subject: "Openings this week", text: `Hey {first}! I've got a few openings this week. Grab yours before they're gone 💈 ${siteUrl}/book` },
  { label: "Going live", subject: "I'm live right now", text: `Hey {first}, I'm live from the chair right now — come watch! ${siteUrl}/live` },
  { label: "Closed", subject: "Schedule update", text: "Hey {first}, heads up: I'll be closed this weekend. Book your next cut early so you don't miss out." },
  { label: "Miss you", subject: "It's been a minute", text: `Hey {first}, it's been a minute! Ready for a fresh cut? Book here: ${siteUrl}/book` },
];

export function Announce() {
  const [clients, setClients] = useState<Client[]>([]);
  const [history, setHistory] = useState<Broadcast[]>([]);
  const [audience, setAudience] = useState<Audience>("all");
  const [tag, setTag] = useState<string>("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [mode, setMode] = useState<"compose" | "texting">("compose");
  const [sent, setSent] = useState<Set<string>>(new Set());
  const [msg, setMsg] = useState<{ text: string; tone: "info" | "error" } | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [c, b] = await Promise.all([
      sb().from("client_stats").select("*").order("name"),
      sb().from("broadcasts").select("*").order("created_at", { ascending: false }).limit(20),
    ]);
    setClients((c.data ?? []) as Client[]);
    setHistory((b.data ?? []) as Broadcast[]);
  }, []);
  useEffect(() => { load(); }, [load]);

  const tags = useMemo(() => [...new Set(clients.flatMap((c) => c.tags))].sort(), [clients]);
  const group = useMemo(
    () => clients.filter((c) => matchesFilter(c, audience) && (!tag || c.tags.includes(tag))),
    [clients, audience, tag],
  );
  const textable = group.filter((c) => c.phone && !c.sms_opt_out);
  const emailable = group.filter((c) => c.email && !c.email_opt_out);
  const audienceLabel = `${AUDIENCES.find((a) => a.id === audience)?.label}${tag ? ` · #${tag}` : ""}`;
  const personalize = (c: Client) => message.replace(/\{first\}/gi, c.name.split(/\s+/)[0] || "there");

  async function startTexting() {
    if (!message.trim()) return setMsg({ text: "Write your message first.", tone: "error" });
    setSent(new Set());
    setMode("texting");
    await sb().from("broadcasts").insert({ channel: "sms", message, audience: audienceLabel, recipient_count: textable.length });
    load();
  }

  async function sendEmail() {
    if (!subject.trim() || !message.trim()) return setMsg({ text: "Add a subject and message.", tone: "error" });
    if (!confirm(`Email ${emailable.length} client${emailable.length === 1 ? "" : "s"}?`)) return;
    setBusy(true);
    setMsg(null);
    const { data } = await sb().auth.getSession();
    const res = await fetch("/api/admin/broadcast", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session?.access_token}` },
      body: JSON.stringify({ subject, message, clientIds: emailable.map((c) => c.id), audience: audienceLabel }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    setMsg(res.ok ? { text: `Sent to ${json.sent} client${json.sent === 1 ? "" : "s"} ✅`, tone: "info" } : { text: json.error ?? "Couldn't send.", tone: "error" });
    load();
  }

  if (mode === "texting") {
    const left = textable.filter((c) => !sent.has(c.id));
    return (
      <div>
        <div className="card mb-4 p-5">
          <div className="flex items-center justify-between">
            <p className="font-semibold">Texting {textable.length} clients</p>
            <button className="btn-ghost !px-3 !py-1.5 !text-xs" onClick={() => setMode("compose")}>Done</button>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-2">
            <div className="h-full bg-gold transition-all" style={{ width: `${textable.length ? (sent.size / textable.length) * 100 : 0}%` }} />
          </div>
          <p className="mt-2 text-sm text-muted">
            {sent.size} sent · {left.length} to go. Tap <b className="text-fg">Text</b>, hit send in Messages, then come back for the next one.
            Each person gets their own private text.
          </p>
        </div>
        <div className="space-y-2">
          {textable.map((c) => (
            <div key={c.id} className={`card flex items-center gap-3 p-4 ${sent.has(c.id) ? "opacity-40" : ""}`}>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{c.name}</span>
                <span className="block text-xs text-muted">{prettyPhone(c.phone)}</span>
              </span>
              <a href={smsLink(c.phone!, personalize(c))} onClick={() => setSent((s) => new Set(s).add(c.id))}
                className={sent.has(c.id) ? "btn-ghost !px-4 !py-2 !text-xs" : "btn-primary !px-4 !py-2 !text-[0.7rem]"}>
                {sent.has(c.id) ? "Sent ✓" : "Text"}
              </a>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
      <section className="card p-5">
        <h2 className="font-display text-2xl font-bold">New announcement</h2>

        <p className="mb-2 mt-5 text-xs font-semibold uppercase tracking-[0.25em] text-muted">Who</p>
        <div className="flex flex-wrap gap-2">
          {AUDIENCES.map((a) => (
            <button key={a.id} onClick={() => setAudience(a.id)}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${audience === a.id ? "border-fg bg-fg text-black" : "border-line text-muted"}`}>
              {a.label}
            </button>
          ))}
          {tags.length > 0 && (
            <select className="input !w-auto !rounded-full !py-1.5 text-xs" value={tag} onChange={(e) => setTag(e.target.value)}>
              <option value="">Any tag</option>
              {tags.map((t) => <option key={t} value={t}>#{t}</option>)}
            </select>
          )}
        </div>
        <p className="mt-2 text-sm text-muted">{group.length} clients · {textable.length} by text · {emailable.length} by email</p>

        <p className="mb-2 mt-5 text-xs font-semibold uppercase tracking-[0.25em] text-muted">Message</p>
        <div className="no-scrollbar -mx-1 mb-2 flex gap-2 overflow-x-auto px-1">
          {TEMPLATES.map((t) => (
            <button key={t.label} onClick={() => { setSubject(t.subject); setMessage(t.text); }}
              className="shrink-0 rounded-full bg-surface-2 px-3 py-1.5 text-xs font-semibold text-muted hover:text-fg">{t.label}</button>
          ))}
        </div>
        <input className="input mb-2" placeholder="Subject (for email)" value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={120} />
        <textarea className="input min-h-36" placeholder="Write your announcement… use {first} for their first name" value={message}
          onChange={(e) => setMessage(e.target.value)} maxLength={1500} />
        <p className="mt-1 text-right text-xs text-muted">{message.length} characters{message.length > 160 ? " · long texts may arrive as 2+ messages" : ""}</p>

        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <button className="btn-primary" disabled={!textable.length} onClick={startTexting}>Text {textable.length} from my phone</button>
          <button className="btn-ghost" disabled={!emailable.length || busy} onClick={sendEmail}>{busy ? "Sending…" : `Email ${emailable.length}`}</button>
        </div>
        {msg && <div className="mt-3"><Notice msg={msg.text} tone={msg.tone} /></div>}
        <p className="mt-4 text-xs text-muted">
          Texts go out from your own number, one private message per client. Emails include an unsubscribe link automatically.
        </p>
      </section>

      <section className="card p-5">
        <h2 className="font-display text-2xl font-bold">Sent</h2>
        {history.length === 0 && <p className="mt-3 text-sm text-muted">Nothing sent yet.</p>}
        <ul className="mt-3 space-y-2">
          {history.map((b) => (
            <li key={b.id} className="rounded-xl bg-surface-2 p-3 text-sm">
              <div className="flex justify-between text-xs text-muted">
                <span>{b.channel === "sms" ? "📱 Text" : "✉️ Email"} · {b.audience}</span>
                <span>{formatDateShort(b.created_at)}</span>
              </div>
              {b.subject && <p className="mt-1 font-semibold">{b.subject}</p>}
              <p className="mt-1 line-clamp-2 text-muted">{b.message}</p>
              <p className="mt-1 text-xs text-muted">{b.recipient_count} recipients</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
