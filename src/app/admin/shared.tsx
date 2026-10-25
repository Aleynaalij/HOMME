"use client";

import { getBrowserClient } from "@/lib/supabase";

export const sb = () => getBrowserClient();

export type Client = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
  tags: string[];
  source: "manual" | "import" | "booking";
  email_opt_out: boolean;
  sms_opt_out: boolean;
  created_at: string;
  visits: number;
  total_spent_cents: number;
  last_visit: string | null;
  next_visit: string | null;
  no_shows: number;
};

export function Notice({ msg, tone = "info" }: { msg: string | null; tone?: "info" | "error" }) {
  if (!msg) return null;
  return (
    <p className={`rounded-xl px-4 py-3 text-sm ${tone === "error" ? "bg-danger/10 text-danger" : "bg-gold/10 text-gold-soft"}`}>{msg}</p>
  );
}

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center" onClick={onClose}>
      <div
        className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-line bg-surface p-6 sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-display text-2xl font-bold">{title}</h2>
          <button onClick={onClose} className="btn-ghost !px-3 !py-1.5" aria-label="Close">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}
