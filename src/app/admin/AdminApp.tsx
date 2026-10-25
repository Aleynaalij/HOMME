"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import type { Appointment, AppointmentStatus, BusinessHours, Review, Service } from "@/lib/types";
import { WEEKDAYS, duration, formatDateShort, formatTime, money, shopNow } from "@/lib/format";
import { brand } from "@/lib/config";
import { Logo } from "@/components/Logo";
import { Stars } from "@/components/Stars";
import { LiveDot } from "@/components/live";
import { ADMIN_APK_URL, InstallApp } from "@/components/InstallApp";
import { PLATFORM_LABEL, type LiveStatus, type Platform } from "@/lib/live-shared";

import { sb } from "./shared";
import { Clients } from "./tabs/Clients";
import { Announce } from "./tabs/Announce";
import { Marketing } from "./tabs/Marketing";
import { Gallery } from "./tabs/Gallery";
import { BookForClient } from "./tabs/BookForClient";
import { Waitlist } from "./tabs/Waitlist";
import { prettyPhone, smsLink } from "@/lib/contacts";

type Tab = "appointments" | "clients" | "announce" | "marketing" | "gallery" | "services" | "hours" | "live" | "reviews";
const TABS: { id: Tab; label: string }[] = [
  { id: "appointments", label: "Appointments" },
  { id: "clients", label: "Clients" },
  { id: "announce", label: "Announce" },
  { id: "marketing", label: "QR & Marketing" },
  { id: "gallery", label: "Gallery" },
  { id: "services", label: "Services" },
  { id: "hours", label: "Hours" },
  { id: "live", label: "Live" },
  { id: "reviews", label: "Reviews" },
];

export function AdminApp() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    sb().auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = sb().auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) return setIsAdmin(null);
    sb().rpc("is_admin").then(({ data }) => setIsAdmin(Boolean(data)));
  }, [session]);

  if (session === undefined) return <Shell><p className="text-muted">Loading…</p></Shell>;
  if (!session)
    return (
      <Shell>
        <Login />
        <div className="mx-auto mt-6 max-w-sm pb-10">
          <InstallApp title="Get HOMME Admin" blurb="Your dashboard as an app on your phone." apkUrl={ADMIN_APK_URL} />
        </div>
      </Shell>
    );
  if (isAdmin === null) return <Shell><p className="text-muted">Checking access…</p></Shell>;
  if (!isAdmin)
    return (
      <Shell>
        <div className="card mx-auto max-w-md p-6 text-center">
          <p className="font-semibold">{session.user.email} isn&apos;t an owner account.</p>
          <p className="mt-2 text-sm text-muted">Ask the site admin to add this email to the owners list.</p>
          <button className="btn-ghost mt-5" onClick={() => sb().auth.signOut()}>Sign out</button>
        </div>
      </Shell>
    );
  return <Dashboard email={session.user.email ?? ""} />;
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="grain min-h-dvh">
      <header className="flex h-16 items-center justify-center"><Logo className="h-6 w-auto" /></header>
      <main className="px-5 pt-10">{children}</main>
    </div>
  );
}

function Login() {
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const { error } =
      mode === "in"
        ? await sb().auth.signInWithPassword({ email, password })
        : await sb().auth.signUp({ email, password, options: { emailRedirectTo: `${location.origin}/admin` } });
    setBusy(false);
    if (error) setMsg(error.message === "Failed to fetch" ? "Couldn't reach the server — check your connection and try again." : error.message);
    else if (mode === "up") setMsg("Check your email to confirm your account, then sign in.");
  }

  return (
    <form onSubmit={submit} className="card mx-auto max-w-sm p-6">
      <h1 className="font-display text-3xl font-bold">Owner {mode === "in" ? "login" : "sign up"}</h1>
      <div className="mt-6 space-y-3">
        <input className="input" type="email" required placeholder="Email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input className="input" type="password" required minLength={8} placeholder="Password" autoComplete={mode === "in" ? "current-password" : "new-password"}
          value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      {msg && <p className="mt-4 text-sm text-gold-soft">{msg}</p>}
      <button className="btn-primary mt-6 w-full" disabled={busy}>{mode === "in" ? "Sign in" : "Create account"}</button>
      <button type="button" className="mt-4 w-full text-sm text-muted hover:text-fg" onClick={() => setMode(mode === "in" ? "up" : "in")}>
        {mode === "in" ? "First time? Create an account" : "Have an account? Sign in"}
      </button>
    </form>
  );
}

function Dashboard({ email }: { email: string }) {
  const [tab, setTab] = useState<Tab>("appointments");
  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-30 border-b border-line bg-bg/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-5">
          <Logo className="h-6 w-auto" />
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden text-muted sm:inline">{email}</span>
            <button className="btn-ghost !px-3 !py-1.5" onClick={() => sb().auth.signOut()}>Sign out</button>
          </div>
        </div>
        <nav className="no-scrollbar mx-auto flex max-w-5xl gap-1 overflow-x-auto px-5 pb-3">
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-semibold ${tab === t.id ? "bg-fg text-black" : "text-muted hover:text-fg"}`}>
              {t.label}
            </button>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-5xl px-5 py-8">
        {tab === "appointments" && <Appointments />}
        {tab === "clients" && <Clients />}
        {tab === "announce" && <Announce />}
        {tab === "marketing" && <Marketing />}
        {tab === "gallery" && <Gallery />}
        {tab === "services" && <Services />}
        {tab === "hours" && <Hours />}
        {tab === "live" && <Live />}
        {tab === "reviews" && <Reviews />}
      </main>
    </div>
  );
}

/* ---------------- Appointments ---------------- */

const STATUS_STYLE: Record<AppointmentStatus, string> = {
  pending_payment: "bg-gold/15 text-gold",
  confirmed: "bg-ok/15 text-ok",
  completed: "bg-surface-2 text-muted",
  cancelled: "bg-danger/15 text-danger",
  no_show: "bg-danger/15 text-danger",
};

function Insights() {
  const [s, setS] = useState<{ week: number; month: number; newClients: number; noShowRate: number | null } | null>(null);

  useEffect(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);
    const since90 = new Date(Date.now() - 90 * 86_400_000);
    const from = new Date(Math.min(monthStart.getTime(), weekStart.getTime(), since90.getTime())).toISOString();
    Promise.all([
      sb().from("appointments").select("starts_at, amount_cents, status").gte("starts_at", from).lte("starts_at", now.toISOString()),
      sb().from("clients").select("id", { count: "exact", head: true }).gte("created_at", monthStart.toISOString()),
    ]).then(([a, c]) => {
      const rows = (a.data ?? []) as { starts_at: string; amount_cents: number; status: string }[];
      const sum = (since: Date) => rows.filter((r) => r.status === "completed" && new Date(r.starts_at) >= since).reduce((n, r) => n + r.amount_cents, 0);
      const recent = rows.filter((r) => new Date(r.starts_at) >= since90 && ["completed", "no_show"].includes(r.status));
      setS({
        week: sum(weekStart),
        month: sum(monthStart),
        newClients: c.count ?? 0,
        noShowRate: recent.length ? Math.round((recent.filter((r) => r.status === "no_show").length / recent.length) * 100) : null,
      });
    });
  }, []);

  if (!s) return null;
  return (
    <div className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
      <Stat label="Earned this week" value={money(s.week)} />
      <Stat label="Earned this month" value={money(s.month)} />
      <Stat label="New clients (month)" value={String(s.newClients)} />
      <Stat label="No-show rate (90d)" value={s.noShowRate === null ? "—" : `${s.noShowRate}%`} />
    </div>
  );
}

function Appointments() {
  const [booking, setBooking] = useState(false);
  const [view, setView] = useState<"upcoming" | "past">("upcoming");
  const [rows, setRows] = useState<Appointment[] | null>(null);

  const load = useCallback(async () => {
    setRows(null);
    const now = new Date().toISOString();
    let q = sb().from("appointments").select("*");
    q = view === "upcoming"
      ? q.gte("ends_at", now).order("starts_at", { ascending: true })
      : q.lt("ends_at", now).order("starts_at", { ascending: false }).limit(100);
    const { data } = await q;
    setRows((data ?? []) as Appointment[]);
  }, [view]);

  useEffect(() => { load(); }, [load]);

  async function setStatus(a: Appointment, status: AppointmentStatus) {
    await sb().from("appointments").update({ status }).eq("id", a.id);
    // Cancelled → client/owner/waitlist emails; completed → review request email.
    if (status === "cancelled" || status === "completed") {
      fetch("/api/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: a.manage_token, event: status }),
      }).catch(() => {});
    }
    load();
  }
  async function markPaid(id: string) {
    await sb().from("appointments").update({ payment_status: "paid" }).eq("id", id);
    load();
  }

  const groups = useMemo(() => {
    const m = new Map<string, Appointment[]>();
    (rows ?? []).forEach((a) => {
      const k = formatDateShort(a.starts_at);
      m.set(k, [...(m.get(k) ?? []), a]);
    });
    return [...m.entries()];
  }, [rows]);

  const upcomingActive = (rows ?? []).filter((a) => a.status === "confirmed" || a.status === "pending_payment");
  const todayKey = formatDateShort(new Date());
  const todayCount = upcomingActive.filter((a) => formatDateShort(a.starts_at) === todayKey).length;
  const expected = upcomingActive.reduce((s, a) => s + a.amount_cents, 0);

  return (
    <div>
      <Insights />
      {view === "upcoming" && rows && (
        <div className="mb-6 grid grid-cols-3 gap-3">
          <Stat label="Today" value={String(todayCount)} />
          <Stat label="Upcoming" value={String(upcomingActive.length)} />
          <Stat label="Booked ahead" value={money(expected)} />
        </div>
      )}
      <div className="mb-6 flex flex-wrap gap-2">
        {(["upcoming", "past"] as const).map((v) => (
          <button key={v} onClick={() => setView(v)} className={`btn-ghost !py-1.5 capitalize ${view === v ? "!border-fg" : ""}`}>{v}</button>
        ))}
        <button onClick={load} className="btn-ghost ml-auto !py-1.5">Refresh</button>
        <button onClick={() => setBooking(true)} className="btn-primary whitespace-nowrap !px-4 !py-1.5 !text-[0.7rem]">+ Book</button>
      </div>
      {booking && <BookForClient onClose={() => setBooking(false)} onBooked={load} />}
      {view === "upcoming" && <Waitlist />}
      {rows === null && <p className="text-muted">Loading…</p>}
      {rows?.length === 0 && <div className="card p-8 text-center text-muted">No {view} appointments.</div>}
      <div className="space-y-8">
        {groups.map(([day, list]) => (
          <section key={day}>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.25em] text-muted">{day}</h3>
            <div className="space-y-2.5">
              {list.map((a) => (
                <div key={a.id} className={`card p-5 ${a.status === "cancelled" ? "opacity-50" : ""}`}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-lg font-semibold">{formatTime(a.starts_at)} <span className="text-sm font-normal text-muted">– {formatTime(a.ends_at)}</span></p>
                      <p className="mt-0.5 font-semibold">{a.customer_name}</p>
                      <p className="text-sm text-muted">
                        <a href={`tel:${a.customer_phone}`} className="hover:text-fg">{prettyPhone(a.customer_phone)}</a> · <a href={`mailto:${a.customer_email}`} className="hover:text-fg">{a.customer_email}</a>
                      </p>
                    </div>
                    <div className="text-right">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLE[a.status]}`}>{a.status.replace("_", " ")}</span>
                      <p className="mt-2 font-semibold">{money(a.amount_cents)}</p>
                      <p className="text-xs text-muted">{a.payment_status === "paid" ? "Paid" : a.payment_method === "card" ? "Card · unpaid" : "Pay at shop"}</p>
                    </div>
                  </div>
                  <p className="mt-3 text-sm">{a.services.map((s) => s.name).join(" + ")}</p>
                  {a.notes && <p className="mt-2 rounded-lg bg-surface-2 px-3 py-2 text-sm text-muted">“{a.notes}”</p>}
                  {a.status !== "cancelled" && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {a.status !== "completed" && <button className="btn-ghost !px-3 !py-1.5 !text-xs" onClick={() => setStatus(a, "completed")}>Mark completed</button>}
                      {a.payment_status !== "paid" && <button className="btn-ghost !px-3 !py-1.5 !text-xs" onClick={() => markPaid(a.id)}>Mark paid</button>}
                      {a.status !== "no_show" && a.status !== "completed" && <button className="btn-ghost !px-3 !py-1.5 !text-xs" onClick={() => setStatus(a, "no_show")}>No-show</button>}
                      {a.status !== "completed" && (
                        <button className="btn-ghost !px-3 !py-1.5 !text-xs !text-danger"
                          onClick={() => confirm(`Cancel ${a.customer_name}'s appointment? They'll get a cancellation email.`) && setStatus(a, "cancelled")}>Cancel</button>
                      )}
                      {a.status === "completed" && a.customer_phone && (
                        <a className="btn-ghost !px-3 !py-1.5 !text-xs"
                          href={smsLink(a.customer_phone, `Thanks for coming in, ${a.customer_name.split(/\s+/)[0]}! If you have 10 seconds, I'd love a quick review: ${location.origin}/appointment/${a.manage_token}`)}>
                          Text review link
                        </a>
                      )}
                      {a.status === "completed" && (
                        <button className="btn-ghost !px-3 !py-1.5 !text-xs"
                          onClick={() => navigator.clipboard.writeText(`${location.origin}/appointment/${a.manage_token}`)}>Copy review link</button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-4">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  );
}

/* ---------------- Services ---------------- */

function Services() {
  const [rows, setRows] = useState<Service[]>([]);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data } = await sb().from("services").select("*").order("sort_order");
    setRows((data ?? []) as Service[]);
  }, []);
  useEffect(() => { load(); }, [load]);

  const update = (id: string, patch: Partial<Service>) => setRows((r) => r.map((s) => (s.id === id ? { ...s, ...patch } : s)));

  async function save(s: Service) {
    const { error } = await sb().from("services").update({
      name: s.name, price_cents: s.price_cents, duration_min: s.duration_min, price_is_starting: s.price_is_starting,
      is_addon: s.is_addon, active: s.active, sort_order: s.sort_order,
    }).eq("id", s.id);
    setMsg(error ? error.message : `Saved “${s.name}”`);
  }

  async function add() {
    const { error } = await sb().from("services").insert({
      name: "New service", price_cents: 3000, duration_min: 30, active: false, sort_order: rows.length + 1,
    });
    if (error) setMsg(error.message);
    load();
  }

  async function remove(s: Service) {
    if (!confirm(`Delete “${s.name}”? (Tip: you can just hide it instead.)`)) return;
    await sb().from("services").delete().eq("id", s.id);
    load();
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-muted">Changes show on the site within a minute.</p>
        <button className="btn-primary !px-4 !py-2 !text-[0.7rem]" onClick={add}>+ Add service</button>
      </div>
      {msg && <p className="mb-4 text-sm text-gold-soft">{msg}</p>}
      <div className="space-y-2.5">
        {rows.map((s) => (
          <div key={s.id} className={`card grid gap-3 p-4 sm:grid-cols-[2fr_1fr_1fr_auto] sm:items-end ${s.active ? "" : "opacity-60"}`}>
            <label className="text-xs text-muted">Name
              <input className="input mt-1 !py-2" value={s.name} onChange={(e) => update(s.id, { name: e.target.value })} />
            </label>
            <label className="text-xs text-muted">Price ($)
              <input className="input mt-1 !py-2" type="number" min={0} step="1" value={s.price_cents / 100}
                onChange={(e) => update(s.id, { price_cents: Math.round(Number(e.target.value) * 100) })} />
            </label>
            <label className="text-xs text-muted">Minutes
              <input className="input mt-1 !py-2" type="number" min={5} step="5" value={s.duration_min}
                onChange={(e) => update(s.id, { duration_min: Number(e.target.value) })} />
            </label>
            <div className="flex gap-2">
              <button className="btn-primary !px-4 !py-2 !text-[0.7rem]" onClick={() => save(s)}>Save</button>
              <button className="btn-ghost !px-3 !py-2 !text-xs !text-danger" onClick={() => remove(s)}>Delete</button>
            </div>
            <div className="flex flex-wrap gap-4 text-sm text-muted sm:col-span-4">
              <Check label="Visible" checked={s.active} onChange={(v) => update(s.id, { active: v })} />
              <Check label="Add-on" checked={s.is_addon} onChange={(v) => update(s.id, { is_addon: v })} />
              <Check label="“Starting at” price" checked={s.price_is_starting} onChange={(v) => update(s.id, { price_is_starting: v })} />
              <span className="ml-auto">{money(s.price_cents)} · {duration(s.duration_min)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2">
      <input type="checkbox" className="h-4 w-4 accent-[var(--gold)]" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}

/* ---------------- Hours & time off ---------------- */

type TimeOff = { id: string; starts_at: string; ends_at: string; reason: string | null };

function Hours() {
  const [hours, setHours] = useState<BusinessHours[]>([]);
  const [off, setOff] = useState<TimeOff[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [block, setBlock] = useState({ date: shopNow().ymd, allDay: true, start: "09:00", end: "12:00", reason: "" });

  const load = useCallback(async () => {
    const [h, t] = await Promise.all([
      sb().from("business_hours").select("*").order("weekday"),
      sb().from("time_off").select("*").gte("ends_at", new Date().toISOString()).order("starts_at"),
    ]);
    setHours((h.data ?? []) as BusinessHours[]);
    setOff((t.data ?? []) as TimeOff[]);
  }, []);
  useEffect(() => { load(); }, [load]);

  const update = (wd: number, patch: Partial<BusinessHours>) => setHours((r) => r.map((h) => (h.weekday === wd ? { ...h, ...patch } : h)));

  async function saveHours() {
    for (const h of hours) {
      const { error } = await sb().from("business_hours").update({
        is_open: h.is_open,
        open_time: h.is_open ? h.open_time ?? "09:00" : null,
        close_time: h.is_open ? h.close_time ?? "17:00" : null,
      }).eq("weekday", h.weekday);
      if (error) return setMsg(`${WEEKDAYS[h.weekday]}: ${error.message}`);
    }
    setMsg("Hours saved");
  }

  async function addBlock(e: React.FormEvent) {
    e.preventDefault();
    // Build local (shop timezone) timestamps; Postgres parses the offset-less string in the session TZ,
    // so we compute the offset explicitly.
    const toIso = (ymd: string, hm: string) => zonedToUtc(ymd, hm, brand.timezone);
    const starts_at = toIso(block.date, block.allDay ? "00:00" : block.start);
    const ends_at = block.allDay ? toIso(block.date, "23:59") : toIso(block.date, block.end);
    const { error } = await sb().from("time_off").insert({ starts_at, ends_at, reason: block.reason || null });
    setMsg(error ? error.message : "Time blocked");
    load();
  }

  async function removeBlock(id: string) {
    await sb().from("time_off").delete().eq("id", id);
    load();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <AlertSettings />
      <section className="card p-5">
        <h2 className="font-display text-2xl font-bold">Weekly hours</h2>
        <div className="mt-5 space-y-3">
          {hours.map((h) => (
            <div key={h.weekday} className="flex flex-wrap items-center gap-3">
              <label className="flex w-32 items-center gap-2 text-sm">
                <input type="checkbox" className="h-4 w-4 accent-[var(--gold)]" checked={h.is_open} onChange={(e) => update(h.weekday, { is_open: e.target.checked })} />
                {WEEKDAYS[h.weekday]}
              </label>
              {h.is_open ? (
                <>
                  <input type="time" className="input !w-auto !py-1.5 text-sm" value={(h.open_time ?? "09:00").slice(0, 5)} onChange={(e) => update(h.weekday, { open_time: e.target.value })} />
                  <span className="text-muted">–</span>
                  <input type="time" className="input !w-auto !py-1.5 text-sm" value={(h.close_time ?? "17:00").slice(0, 5)} onChange={(e) => update(h.weekday, { close_time: e.target.value })} />
                </>
              ) : (
                <span className="text-sm text-muted">Closed</span>
              )}
            </div>
          ))}
        </div>
        <button className="btn-primary mt-6" onClick={saveHours}>Save hours</button>
        {msg && <p className="mt-3 text-sm text-gold-soft">{msg}</p>}
      </section>

      <section className="card p-5">
        <h2 className="font-display text-2xl font-bold">Block off time</h2>
        <p className="mt-1 text-sm text-muted">Vacation, breaks, personal days — clients won&apos;t be able to book these.</p>
        <form onSubmit={addBlock} className="mt-5 space-y-3">
          <input type="date" className="input" required value={block.date} onChange={(e) => setBlock({ ...block, date: e.target.value })} />
          <Check label="All day" checked={block.allDay} onChange={(v) => setBlock({ ...block, allDay: v })} />
          {!block.allDay && (
            <div className="flex items-center gap-2">
              <input type="time" className="input" value={block.start} onChange={(e) => setBlock({ ...block, start: e.target.value })} />
              <span className="text-muted">–</span>
              <input type="time" className="input" value={block.end} onChange={(e) => setBlock({ ...block, end: e.target.value })} />
            </div>
          )}
          <input className="input" placeholder="Reason (private, optional)" value={block.reason} onChange={(e) => setBlock({ ...block, reason: e.target.value })} />
          <button className="btn-primary w-full">Block time</button>
        </form>
        <ul className="mt-6 space-y-2">
          {off.map((t) => (
            <li key={t.id} className="flex items-center justify-between rounded-xl bg-surface-2 px-4 py-3 text-sm">
              <span>
                <span className="font-semibold">{formatDateShort(t.starts_at)}</span>{" "}
                <span className="text-muted">{formatTime(t.starts_at)} – {formatTime(t.ends_at)}{t.reason ? ` · ${t.reason}` : ""}</span>
              </span>
              <button className="text-danger hover:underline" onClick={() => removeBlock(t.id)}>Remove</button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function AlertSettings() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    sb().from("settings").select("notify_email").eq("id", 1).single()
      .then(({ data }) => setEmail((data?.notify_email as string | null) ?? ""));
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await sb().from("settings").update({ notify_email: email.trim() || null }).eq("id", 1);
    setMsg(error ? error.message : email.trim() ? "Saved — new bookings and cancellations will be emailed here." : "Booking alerts turned off.");
  }

  return (
    <form onSubmit={save} className="card p-5 lg:col-span-2">
      <h2 className="font-display text-2xl font-bold">Booking alerts</h2>
      <p className="mt-1 text-sm text-muted">Get an email every time someone books or cancels. Leave blank to turn off.</p>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <input className="input" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
        <button className="btn-primary shrink-0">Save</button>
      </div>
      {msg && <p className="mt-3 text-sm text-gold-soft">{msg}</p>}
    </form>
  );
}

/** Convert a wall-clock date/time in `tz` to a UTC ISO string. */
function zonedToUtc(ymd: string, hm: string, tz: string) {
  const guess = new Date(`${ymd}T${hm}:00Z`);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(guess);
  const g = (t: string) => Number(parts.find((p) => p.type === t)!.value);
  const asTz = Date.UTC(g("year"), g("month") - 1, g("day"), g("hour"), g("minute"));
  return new Date(guess.getTime() - (asTz - guess.getTime())).toISOString();
}

/* ---------------- Live stream ---------------- */

const CHANNEL_HELP: Record<Platform, string> = {
  kick: "Your Kick username — the part after kick.com/",
  twitch: "Your Twitch username — the part after twitch.tv/",
  youtube: "Your YouTube channel ID (starts with UC…). Find it in YouTube Studio → Settings → Channel → Advanced.",
};

function Live() {
  const [platform, setPlatform] = useState<Platform>("kick");
  const [channel, setChannel] = useState("");
  const [manual, setManual] = useState(false);
  const [status, setStatus] = useState<LiveStatus | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const refreshStatus = useCallback(async () => {
    const res = await fetch("/api/live?fresh=1", { cache: "no-store" });
    if (res.ok) setStatus(await res.json());
  }, []);

  useEffect(() => {
    sb().from("settings").select("stream_platform, stream_channel, stream_manual_live").eq("id", 1).single()
      .then(({ data }) => {
        if (!data) return;
        setPlatform(data.stream_platform as Platform);
        setChannel((data.stream_channel as string | null) ?? "");
        setManual(Boolean(data.stream_manual_live));
      });
    refreshStatus();
  }, [refreshStatus]);

  async function save(patch: { stream_platform?: Platform; stream_channel?: string | null; stream_manual_live?: boolean }) {
    const { error } = await sb().from("settings").update(patch).eq("id", 1);
    setMsg(error ? error.message : "Saved");
    await refreshStatus();
  }

  const clean = (v: string) =>
    v.trim().replace(/^https?:\/\/(www\.)?(kick\.com|twitch\.tv|youtube\.com)\/(channel\/)?/i, "").replace(/^@/, "").replace(/\/.*$/, "");

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="card p-5">
        <h2 className="font-display text-2xl font-bold">Live stream</h2>
        <p className="mt-1 text-sm text-muted">When you go live, your stream shows on the website automatically with a red “LIVE NOW” banner.</p>
        <form
          className="mt-5 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            const c = clean(channel);
            setChannel(c);
            save({ stream_platform: platform, stream_channel: c || null });
          }}
        >
          <div className="grid grid-cols-3 gap-2">
            {(["kick", "twitch", "youtube"] as Platform[]).map((p) => (
              <button key={p} type="button" onClick={() => setPlatform(p)}
                className={`rounded-xl border py-2.5 text-sm font-semibold ${platform === p ? "border-gold bg-gold/10" : "border-line hover:border-muted"}`}>
                {PLATFORM_LABEL[p]}
              </button>
            ))}
          </div>
          <label className="block text-xs text-muted">{CHANNEL_HELP[platform]}
            <input className="input mt-1" placeholder={platform === "youtube" ? "UCxxxxxxxxxxxx" : "hommellc"} value={channel} onChange={(e) => setChannel(e.target.value)} />
          </label>
          <button className="btn-primary w-full">Save channel</button>
        </form>
        {msg && <p className="mt-3 text-sm text-gold-soft">{msg}</p>}
      </section>

      <section className="card p-5">
        <h2 className="font-display text-2xl font-bold">Status</h2>
        <div className="mt-4 flex items-center gap-3 rounded-xl bg-surface-2 px-4 py-3">
          {status?.live ? <LiveDot /> : <span className="h-2.5 w-2.5 rounded-full bg-muted/40" />}
          <span className="font-semibold">{status === null ? "Checking…" : status.live ? "LIVE on the website" : "Offline"}</span>
          <button className="ml-auto text-sm text-muted hover:text-fg" onClick={refreshStatus}>Refresh</button>
        </div>
        <p className="mt-3 text-sm text-muted">
          {!status?.channel
            ? "Add your channel to get started."
            : status.source === "api"
              ? `Auto-detect is working — the site checks ${PLATFORM_LABEL[status.platform]} every minute.`
              : status.source === "manual"
                ? "Showing because the “I'm live” switch is on."
                : `Auto-detect isn't available for this channel yet — use the switch below when you go live.`}
        </p>

        <label className="mt-6 flex items-center justify-between gap-4 rounded-xl border border-line px-4 py-4">
          <span>
            <span className="block font-semibold">I&apos;m live</span>
            <span className="block text-sm text-muted">Force the live player on. Turn it off when you finish.</span>
          </span>
          <input type="checkbox" className="h-6 w-6 accent-red-500" checked={manual}
            onChange={(e) => { setManual(e.target.checked); save({ stream_manual_live: e.target.checked }); }} />
        </label>

        {status?.channel && (
          <a href="/live" target="_blank" className="btn-ghost mt-4 w-full">Preview the live page</a>
        )}
      </section>
    </div>
  );
}

/* ---------------- Reviews ---------------- */

function Reviews() {
  const [rows, setRows] = useState<Review[]>([]);
  const load = useCallback(async () => {
    const { data } = await sb().from("reviews").select("*").order("published").order("created_at", { ascending: false });
    setRows((data ?? []) as Review[]);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function toggle(r: Review) {
    await sb().from("reviews").update({ published: !r.published }).eq("id", r.id);
    load();
  }
  async function remove(r: Review) {
    if (!confirm("Delete this review?")) return;
    await sb().from("reviews").delete().eq("id", r.id);
    load();
  }

  const pending = rows.filter((r) => !r.published).length;
  return (
    <div>
      <p className="mb-4 text-sm text-muted">
        {pending ? `${pending} new review${pending === 1 ? "" : "s"} waiting for approval.` : "All reviews are published."} When you mark an
        appointment completed, the client gets a review request by email automatically — or tap “Text review link”.
      </p>
      <div className="space-y-2.5">
        {rows.map((r) => (
          <div key={r.id} className={`card flex flex-wrap items-start justify-between gap-3 p-4 ${r.published ? "" : "!border-gold/50"}`}>
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{r.author_name} <Stars rating={r.rating} className="ml-2 h-3 w-3" /></p>
              {r.body && <p className="mt-1 text-sm text-muted">{r.body}</p>}
              <p className="mt-1 text-xs text-muted/60">{formatDateShort(r.created_at)}</p>
            </div>
            <div className="flex gap-2">
              <button className="btn-ghost !px-3 !py-1.5 !text-xs" onClick={() => toggle(r)}>{r.published ? "Hide" : "Publish"}</button>
              <button className="btn-ghost !px-3 !py-1.5 !text-xs !text-danger" onClick={() => remove(r)}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

