"use client";

import { useEffect, useState } from "react";

/** Always-handy links Tash can copy or share with one tap. */
export function ShareLinks() {
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  useEffect(() => setOrigin(window.location.origin), []);
  if (!origin) return null;

  const links = [
    { id: "book", label: "Booking link", url: `${origin}/book`, text: "Book your next cut with me here:" },
    { id: "site", label: "Website", url: origin, text: "Check out my page:" },
  ];

  async function copy(id: string, url: string) {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Fallback for older webviews
      const t = document.createElement("textarea");
      t.value = url;
      document.body.appendChild(t);
      t.select();
      document.execCommand("copy");
      t.remove();
    }
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  }

  async function share(url: string, text: string) {
    if (navigator.share) await navigator.share({ title: "HOMME", text, url }).catch(() => {});
    else copy("share", url);
  }

  return (
    <section className="lux-card mb-6 p-5">
      <p className="text-[0.65rem] font-semibold uppercase tracking-[0.35em] text-gold">Your links</p>
      <div className="mt-3 space-y-2.5">
        {links.map((l) => (
          <div key={l.id} className="flex flex-wrap items-center gap-2 rounded-2xl bg-white/[0.03] p-3">
            <div className="min-w-[60%] flex-1">
              <p className="text-xs text-muted">{l.label}</p>
              <p className="break-all font-semibold text-ivory">{l.url.replace(/^https?:\/\//, "")}</p>
            </div>
            <button onClick={() => copy(l.id, l.url)} className={`${copied === l.id ? "btn-line" : "btn-gold"} !px-4 !py-2 !text-[0.65rem]`}>
              {copied === l.id ? "Copied ✓" : "Copy"}
            </button>
            <button onClick={() => share(l.url, l.text)} className="btn-line !px-4 !py-2 !text-[0.65rem]">Share</button>
          </div>
        ))}
      </div>
    </section>
  );
}
