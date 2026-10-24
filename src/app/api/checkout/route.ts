import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { getServerClient } from "@/lib/supabase";
import type { PublicAppointment } from "@/lib/types";

export async function POST(req: Request) {
  const stripe = getStripe();
  if (!stripe) return NextResponse.json({ error: "Card payments are not enabled yet" }, { status: 503 });

  const { token } = await req.json().catch(() => ({ token: null }));
  if (typeof token !== "string" || !/^[a-f0-9]{36}$/.test(token)) {
    return NextResponse.json({ error: "Invalid appointment" }, { status: 400 });
  }

  const { data } = await getServerClient().rpc("get_appointment_by_token", { p_token: token });
  const appt = (data as PublicAppointment[] | null)?.[0];
  if (!appt || appt.payment_status === "paid" || !["pending_payment", "confirmed"].includes(appt.status)) {
    return NextResponse.json({ error: "This appointment can't be paid online" }, { status: 400 });
  }

  const origin = req.headers.get("origin") ?? process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: appt.services.map((s) => ({
      quantity: 1,
      price_data: { currency: "usd", unit_amount: s.price_cents, product_data: { name: s.name } },
    })),
    client_reference_id: appt.id,
    metadata: { appointment_id: appt.id, manage_token: token },
    success_url: `${origin}/appointment/${token}?paid=1`,
    cancel_url: `${origin}/appointment/${token}?canceled_payment=1`,
    expires_at: Math.floor(Date.now() / 1000) + 31 * 60,
  });

  return NextResponse.json({ url: session.url });
}
