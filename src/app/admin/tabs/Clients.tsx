"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { contactPickerSupported, parseCSV, parseVCard, pickContacts, prettyPhone, type ContactRow } from "@/lib/contacts";
import { formatDateShort, formatTime, money } from "@/lib/format";
import type { Appointment } from "@/lib/types";
import { Modal, Notice, sb, type Client } from "../shared";

type Filter = "all" | "regulars" | "lapsed" | "new" | "never";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "regulars", label: "Regulars (3+ visits)" },
  { id: "lapsed", label: "Haven't been in 60+ days" },
  { id: "new", label: "New this month" },
  { id: "never", label: "Never booked" },
];

export function matchesFilter(c: Client, f: Filter) {
  const days = (iso: string | null) => (iso ? (Date.now() - new Date(iso).getTime()) / 86_400_000 : Infinity);
  if (f === "regulars") return c.visits >= 3;
  if (f === "lapsed") return c.visits > 0 && days(c.last_visit) > 60 && !c.next_visit;
  if (f === "new") return days(c.created_at) <= 30;
  if (f === "never") return c.visits === 0 && !c.next_visit;
  return true;
}

export function Clients() {
  const [rows, setRows] = useState<Client[] | null>(null);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [open, setOpen] = useState<Client | null>(null);
  const [adding, setAdding] = useState(false);
  const [importing, setImporting] = useState(false);

  const load = useCallback(async () => {
    const { data } = await sb().from("client_stats").select("*").order("name");
    setRows((data ?? []) as Client[]);
  }, []);
  useEffect(() => { load(); }, [load]);

  const shown = useMemo(() => {
    const term = q.trim().toLowerCase();
    const digits = term.replace(/\D/g, "");
    return (rows ?? []).filter(
      (c) =>
        matchesFilter(c, filter) &&
        (!term ||
          c.name.toLowerCase().includes(term) ||
          (c.email ?? "").includes(term) ||
          (digits.length >= 3 && (c.phone ?? "").includes(digits))),
    );
  }, [rows, q, filter]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        <button className="btn-primary !px-4 !py-2 !text-[0.7rem]" onClick={() => setImporting(true)}>Import contacts</button>
        <button className="btn-ghost !py-2" onClick={() => setAdding(true)}>+ Add client</button>
        <span className="ml-auto self-center text-sm text-muted">{rows ? `${rows.length} clients` : ""}</span>
      </div>
      <input className="input" placeholder="Search name, phone or email" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="no-scrollbar -mx-5 mt-3 flex gap-2 overflow-x-auto px-5 pb-1">
        {FILTERS.map((f) => (
          <button key={f.id} onClick={() => setFilter(f.id)}
            className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold ${filter === f.id ? "border-fg bg-fg text-black" : "border-line text-muted"}`}>
            {f.label}
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-2">
        {rows === null && <p className="text-muted">Loading…</p>}
        {rows?.length === 0 && (
          <div className="card p-8 text-center text-muted">
            No clients yet. Import your phone contacts — or they&apos;ll show up here automatically as people book.
          </div>
        )}
        {shown.map((c) => (
          <button key={c.id} onClick={() => setOpen(c)} className="card flex w-full items-center gap-3 p-4 text-left hover:border-muted">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-surface-2 text-xs font-bold text-gold">
              {c.name.split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("")}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-semibold">{c.name}</span>
              <span className="block truncate text-xs text-muted">{prettyPhone(c.phone) || c.email || "No contact info"}</span>
            </span>
            <span className="text-right text-xs text-muted">
              {c.visits ? <span className="block font-semibold text-fg">{c.visits} visit{c.visits === 1 ? "" : "s"}</span> : null}
              {c.next_visit ? <span className="block text-ok">Booked {formatDateShort(c.next_visit)}</span>
                : c.last_visit ? <span className="block">Last {formatDateShort(c.last_visit)}</span> : null}
            </span>
          </button>
        ))}
      </div>

      {open && <ClientDetail client={open} onClose={() => setOpen(null)} onChanged={load} />}
      {adding && <AddClient onClose={() => setAdding(false)} onSaved={load} />}
      {importing && <ImportContacts onClose={() => setImporting(false)} onDone={load} />}
    </div>
  );
}

function ClientDetail({ client, onClose, onChanged }: { client: Client; onClose: () => void; onChanged: () => void }) {
  const [c, setC] = useState(client);
  const [history, setHistory] = useState<Appointment[] | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    sb().from("appointments").select("*").eq("client_id", client.id).order("starts_at", { ascending: false }).limit(50)
      .then(({ data }) => setHistory((data ?? []) as Appointment[]));
  }, [client.id]);

  async function save() {
    const { error } = await sb().from("clients").update({
      name: c.name.trim() || client.name,
      phone: c.phone?.trim() || null,
      email: c.email?.trim().toLowerCase() || null,
      notes: c.notes?.trim() || null,
      tags: c.tags,
      email_opt_out: c.email_opt_out,
      sms_opt_out: c.sms_opt_out,
    }).eq("id", c.id);
    setMsg(error ? (error.message.includes("duplicate") ? "Another client already has that phone or email." : error.message) : "Saved");
    if (!error) onChanged();
  }

  async function remove() {
    if (!confirm(`Remove ${c.name} from your client list? Their past appointments stay.`)) return;
    await sb().from("clients").delete().eq("id", c.id);
    onChanged();
    onClose();
  }

  return (
    <Modal title={c.name} onClose={onClose}>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl bg-surface-2 p-3"><p className="text-xl font-bold">{c.visits}</p><p className="text-xs text-muted">visits</p></div>
        <div className="rounded-xl bg-surface-2 p-3"><p className="text-xl font-bold">{money(c.total_spent_cents)}</p><p className="text-xs text-muted">spent</p></div>
        <div className="rounded-xl bg-surface-2 p-3"><p className="text-xl font-bold">{c.no_shows}</p><p className="text-xs text-muted">no-shows</p></div>
      </div>

      <div className="mt-4 flex gap-2">
        {c.phone && <a href={`tel:${c.phone}`} className="btn-ghost flex-1 !py-2">Call</a>}
        {c.phone && <a href={`sms:${c.phone}`} className="btn-ghost flex-1 !py-2">Text</a>}
        {c.email && <a href={`mailto:${c.email}`} className="btn-ghost flex-1 !py-2">Email</a>}
      </div>

      <div className="mt-5 space-y-3">
        <input className="input" placeholder="Name" value={c.name} onChange={(e) => setC({ ...c, name: e.target.value })} />
        <input className="input" type="tel" placeholder="Phone" value={c.phone ?? ""} onChange={(e) => setC({ ...c, phone: e.target.value })} />
        <input className="input" type="email" placeholder="Email" value={c.email ?? ""} onChange={(e) => setC({ ...c, email: e.target.value })} />
        <textarea className="input min-h-24" placeholder="Private notes — e.g. #2 on the sides, hard part on the left, likes a lineup"
          value={c.notes ?? ""} onChange={(e) => setC({ ...c, notes: e.target.value })} />
        <input className="input" placeholder="Tags, comma separated (e.g. kid, VIP, beard)" value={c.tags.join(", ")}
          onChange={(e) => setC({ ...c, tags: e.target.value.split(",").map((t) => t.trim()).filter(Boolean) })} />
        <div className="flex flex-wrap gap-4 text-sm text-muted">
          <label className="flex items-center gap-2"><input type="checkbox" className="h-4 w-4 accent-[var(--gold)]" checked={!c.sms_opt_out} onChange={(e) => setC({ ...c, sms_opt_out: !e.target.checked })} /> OK to text</label>
          <label className="flex items-center gap-2"><input type="checkbox" className="h-4 w-4 accent-[var(--gold)]" checked={!c.email_opt_out} onChange={(e) => setC({ ...c, email_opt_out: !e.target.checked })} /> OK to email</label>
        </div>
        <Notice msg={msg} />
        <div className="flex gap-2">
          <button className="btn-primary flex-1" onClick={save}>Save</button>
          <button className="btn-ghost !text-danger" onClick={remove}>Remove</button>
        </div>
      </div>

      <h3 className="mb-2 mt-6 text-xs font-semibold uppercase tracking-[0.25em] text-muted">History</h3>
      {history === null && <p className="text-sm text-muted">Loading…</p>}
      {history?.length === 0 && <p className="text-sm text-muted">No appointments yet.</p>}
      <ul className="space-y-1.5">
        {history?.map((a) => (
          <li key={a.id} className="flex justify-between gap-3 rounded-xl bg-surface-2 px-3 py-2 text-sm">
            <span>
              <span className="font-semibold">{formatDateShort(a.starts_at)}</span> <span className="text-muted">{formatTime(a.starts_at)}</span>
              <span className="block text-xs text-muted">{a.services.map((s) => s.name).join(" + ")}</span>
            </span>
            <span className="text-right text-xs">
              <span className="block font-semibold">{money(a.amount_cents)}</span>
              <span className="text-muted">{a.status.replace("_", " ")}</span>
            </span>
          </li>
        ))}
      </ul>
    </Modal>
  );
}

function AddClient({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({ name: "", phone: "", email: "" });
  const [msg, setMsg] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const { data, error } = await sb().rpc("import_clients", { p_rows: [f] });
    const r = (data as { added: number; matched: number; skipped: number }[] | null)?.[0];
    if (error) return setMsg(error.message);
    if (r?.skipped) return setMsg("Add a phone number or email.");
    onSaved();
    onClose();
  }

  return (
    <Modal title="Add client" onClose={onClose}>
      <form onSubmit={save} className="space-y-3">
        <input className="input" required placeholder="Name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        <input className="input" type="tel" placeholder="Phone" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
        <input className="input" type="email" placeholder="Email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
        <Notice msg={msg} tone="error" />
        <button className="btn-primary w-full">Add client</button>
      </form>
    </Modal>
  );
}

function ImportContacts({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [preview, setPreview] = useState<ContactRow[] | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [picker, setPicker] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => setPicker(contactPickerSupported()), []);

  function show(list: ContactRow[]) {
    if (!list.length) return setMsg("No contacts with a phone number or email were found in that file.");
    setMsg(null);
    setPreview(list);
    setSelected(new Set(list.map((_, i) => i)));
  }

  async function fromPhone() {
    try {
      show(await pickContacts());
    } catch {
      setMsg("Couldn't open your contacts. Try the file option instead.");
    }
  }

  async function fromFile(file: File) {
    const text = await file.text();
    show(/BEGIN:VCARD/i.test(text) ? parseVCard(text) : parseCSV(text));
  }

  async function doImport() {
    if (!preview) return;
    setBusy(true);
    const rows = preview.filter((_, i) => selected.has(i));
    let added = 0, matched = 0, skipped = 0;
    for (let i = 0; i < rows.length; i += 200) {
      const { data, error } = await sb().rpc("import_clients", { p_rows: rows.slice(i, i + 200) });
      if (error) {
        setBusy(false);
        return setMsg(error.message);
      }
      const r = (data as { added: number; matched: number; skipped: number }[])[0];
      added += r.added; matched += r.matched; skipped += r.skipped;
    }
    setBusy(false);
    setPreview(null);
    setMsg(`Done! ${added} new client${added === 1 ? "" : "s"} added${matched ? `, ${matched} already on your list` : ""}${skipped ? `, ${skipped} skipped (no valid phone/email)` : ""}.`);
    onDone();
  }

  const allOn = preview && selected.size === preview.length;

  return (
    <Modal title="Import contacts" onClose={onClose}>
      {!preview && (
        <div className="space-y-3">
          {picker && (
            <button className="btn-primary w-full" onClick={fromPhone}>Choose from my phone&apos;s contacts</button>
          )}
          <button className={`${picker ? "btn-ghost" : "btn-primary"} w-full`} onClick={() => fileRef.current?.click()}>
            Upload a contacts file (.vcf or .csv)
          </button>
          <input ref={fileRef} type="file" accept=".vcf,.vcard,.csv,text/vcard,text/csv" className="hidden"
            onChange={(e) => e.target.files?.[0] && fromFile(e.target.files[0])} />
          <Notice msg={msg} />
          <details className="rounded-xl bg-surface-2 p-4 text-sm text-muted">
            <summary className="cursor-pointer font-semibold text-fg">How do I get a contacts file?</summary>
            <ul className="mt-3 list-disc space-y-2 pl-5">
              <li><b className="text-fg">iPhone:</b> Contacts app → Lists → long-press “All Contacts” → Export → save to Files. Then upload it here.</li>
              <li><b className="text-fg">Android:</b> Contacts app → Fix &amp; manage (or Settings) → Export to file (.vcf). Or use the button above in Chrome / the HOMME Admin app.</li>
              <li><b className="text-fg">Google Contacts:</b> contacts.google.com → Export → Google CSV.</li>
            </ul>
          </details>
          <p className="text-xs text-muted">Contacts stay private to your dashboard. Only people with a phone number or email are imported, and duplicates are merged automatically.</p>
        </div>
      )}

      {preview && (
        <div>
          <div className="mb-3 flex items-center justify-between text-sm">
            <span className="text-muted">{selected.size} of {preview.length} selected</span>
            <button className="font-semibold text-gold" onClick={() => setSelected(allOn ? new Set() : new Set(preview.map((_, i) => i)))}>
              {allOn ? "Select none" : "Select all"}
            </button>
          </div>
          <ul className="max-h-[45dvh] space-y-1 overflow-y-auto">
            {preview.map((c, i) => (
              <li key={i}>
                <label className="flex items-center gap-3 rounded-xl px-3 py-2 hover:bg-surface-2">
                  <input type="checkbox" className="h-4 w-4 accent-[var(--gold)]" checked={selected.has(i)}
                    onChange={(e) => {
                      const s = new Set(selected);
                      if (e.target.checked) s.add(i); else s.delete(i);
                      setSelected(s);
                    }} />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">{c.name || "(no name)"}</span>
                    <span className="block truncate text-xs text-muted">{[c.phone, c.email].filter(Boolean).join(" · ")}</span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
          <Notice msg={msg} tone="error" />
          <div className="mt-4 flex gap-2">
            <button className="btn-ghost" onClick={() => setPreview(null)}>Back</button>
            <button className="btn-primary flex-1" disabled={busy || selected.size === 0} onClick={doImport}>
              {busy ? "Importing…" : `Import ${selected.size} contact${selected.size === 1 ? "" : "s"}`}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
