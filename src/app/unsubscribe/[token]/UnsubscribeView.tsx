"use client";

import Link from "next/link";
import { useState } from "react";
import { getBrowserClient } from "@/lib/supabase";
import { brand } from "@/lib/config";
import { Logo } from "@/components/Logo";

// Unsubscribing takes a tap (not just opening the link) so email link-scanners can't trigger it.
export function UnsubscribeView({ token }: { token: string }) {
  const [state, setState] = useState<"ask" | "busy" | "done" | "missing">("ask");

  async function confirm() {
    setState("busy");
    const { data } = await getBrowserClient().rpc("unsubscribe_client", { p_token: token });
    setState(data ? "done" : "missing");
  }

  return (
    <main className="grain flex min-h-dvh flex-col items-center justify-center px-5 text-center">
      <Logo className="h-8 w-auto" />
      <h1 className="mt-10 font-display text-4xl font-bold">
        {state === "done" ? "You're unsubscribed" : state === "missing" ? "Link not found" : "Unsubscribe from announcements?"}
      </h1>
      <p className="mt-3 max-w-sm text-muted">
        {state === "done"
          ? `You won't get announcement emails from ${brand.legalName} anymore. Appointment confirmations still come through.`
          : state === "missing"
            ? "This unsubscribe link isn't valid. Reply to any of our emails and we'll remove you."
            : "You'll stop getting news and openings by email. Appointment confirmations still come through."}
      </p>
      {(state === "ask" || state === "busy") && (
        <button className="btn-primary mt-8" disabled={state === "busy"} onClick={confirm}>
          {state === "busy" ? "One sec…" : "Unsubscribe"}
        </button>
      )}
      <Link href="/" className="btn-ghost mt-4">Back to HOMME</Link>
    </main>
  );
}
