export type ContactRow = { name: string; phone: string | null; email: string | null };

/** Android Chrome (and the HOMME Admin app) can open the phone's contact picker directly. */
export function contactPickerSupported() {
  return typeof navigator !== "undefined" && "contacts" in navigator && "ContactsManager" in window;
}

type PickedContact = { name?: string[]; tel?: string[]; email?: string[] };

export async function pickContacts(): Promise<ContactRow[]> {
  const nav = navigator as Navigator & {
    contacts: { select: (props: string[], opts: { multiple: boolean }) => Promise<PickedContact[]> };
  };
  const picked = await nav.contacts.select(["name", "tel", "email"], { multiple: true });
  return picked
    .map((c) => ({ name: c.name?.[0]?.trim() || "", phone: c.tel?.[0] ?? null, email: c.email?.[0] ?? null }))
    .filter((c) => c.phone || c.email);
}

/** Parse a .vcf file (iPhone "Share Contact"/export, Android export, Google/iCloud export). */
export function parseVCard(text: string): ContactRow[] {
  // Unfold continuation lines (RFC 6350: lines starting with space/tab continue the previous one)
  const lines = text.replace(/\r\n/g, "\n").replace(/\n[ \t]/g, "").split("\n");
  const out: ContactRow[] = [];
  let cur: { fn?: string; n?: string; tels: { v: string; pref: number }[]; emails: string[] } | null = null;

  for (const raw of lines) {
    const line = raw.trim();
    if (/^BEGIN:VCARD/i.test(line)) cur = { tels: [], emails: [] };
    else if (/^END:VCARD/i.test(line) && cur) {
      const name = cur.fn || cur.n || "";
      const tel = cur.tels.sort((a, b) => b.pref - a.pref)[0]?.v ?? null;
      if (tel || cur.emails[0]) out.push({ name, phone: tel, email: cur.emails[0] ?? null });
      cur = null;
    } else if (cur) {
      const idx = line.indexOf(":");
      if (idx < 0) continue;
      const key = line.slice(0, idx).replace(/^item\d+\./i, "");
      const value = decodeValue(line.slice(idx + 1), key);
      const prop = key.split(";")[0].toUpperCase();
      if (prop === "FN") cur.fn = value;
      else if (prop === "N" && !cur.n) {
        const [last, first] = value.split(";");
        cur.n = [first, last].filter(Boolean).join(" ").trim();
      } else if (prop === "TEL") {
        const k = key.toUpperCase();
        cur.tels.push({ v: value.replace(/^tel:/i, ""), pref: (k.includes("CELL") || k.includes("MOBILE") ? 2 : 0) + (k.includes("PREF") ? 1 : 0) });
      } else if (prop === "EMAIL") cur.emails.push(value);
    }
  }
  return out;
}

function decodeValue(v: string, key: string) {
  let s = v;
  if (/ENCODING=QUOTED-PRINTABLE/i.test(key)) {
    try {
      s = decodeURIComponent(s.replace(/=\r?\n/g, "").replace(/=([0-9A-F]{2})/gi, "%$1"));
    } catch {
      /* keep raw */
    }
  }
  return s.replace(/\\,/g, ",").replace(/\\;/g, ";").replace(/\\n/gi, " ").trim();
}

/** Parse CSV (Google Contacts, Outlook, or any sheet with name/phone/email columns). */
export function parseCSV(text: string): ContactRow[] {
  const rows = csvRows(text.replace(/^﻿/, ""));
  if (rows.length < 2) return [];
  const header = rows[0].map((h) => h.trim().toLowerCase());
  const find = (...tests: ((h: string) => boolean)[]) => {
    for (const t of tests) {
      const i = header.findIndex(t);
      if (i >= 0) return i;
    }
    return -1;
  };
  const full = find((h) => h === "name" || h === "full name" || h === "display name");
  const first = find((h) => h === "first name" || h === "given name");
  const last = find((h) => h === "last name" || h === "family name");
  const phone = find(
    (h) => h === "phone" || h === "phone number" || h === "mobile" || h === "mobile phone",
    (h) => h === "phone 1 - value",
    (h) => h.includes("phone") && !h.includes("type") && !h.includes("label"),
  );
  const email = find(
    (h) => h === "email" || h === "e-mail" || h === "email address" || h === "e-mail address",
    (h) => h === "e-mail 1 - value",
    (h) => h.includes("mail") && !h.includes("type") && !h.includes("label"),
  );

  return rows
    .slice(1)
    .map((r) => {
      const name = full >= 0 ? r[full] : [first >= 0 ? r[first] : "", last >= 0 ? r[last] : ""].join(" ");
      // Google exports can pack several numbers as "a ::: b"
      const p = phone >= 0 ? r[phone]?.split(":::")[0] : "";
      const e = email >= 0 ? r[email]?.split(":::")[0] : "";
      return { name: (name ?? "").trim(), phone: p?.trim() || null, email: e?.trim() || null };
    })
    .filter((c) => c.phone || c.email);
}

function csvRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      if (row.some((f) => f.trim())) rows.push(row);
      row = [];
      field = "";
    } else field += ch;
  }
  row.push(field);
  if (row.some((f) => f.trim())) rows.push(row);
  return rows;
}

/** Format +13015550101 as (301) 555-0101 for display. */
export function prettyPhone(p: string | null) {
  if (!p) return "";
  const m = p.replace(/[^\d+]/g, "").match(/^(?:\+?1)?(\d{3})(\d{3})(\d{4})$/);
  return m ? `(${m[1]}) ${m[2]}-${m[3]}` : p;
}

/** sms: link for one recipient, works on iPhone and Android. */
export function smsLink(phone: string, body: string) {
  const isIOS = typeof navigator !== "undefined" && /iphone|ipad|ipod/i.test(navigator.userAgent);
  return `sms:${phone}${isIOS ? "&" : "?"}body=${encodeURIComponent(body)}`;
}
