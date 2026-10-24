import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { getServiceClient } from "@/lib/supabase";

export async function POST(req: Request) {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const db = getServiceClient();
  if (!stripe || !secret || !db) return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(await req.text(), req.headers.get("stripe-signature") ?? "", secret);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const id = session.metadata?.appointment_id;
    if (id && session.payment_status === "paid") {
      await db
        .from("appointments")
        .update({ payment_status: "paid", status: "confirmed", stripe_session_id: session.id })
        .eq("id", id)
        .in("status", ["pending_payment", "confirmed"]);
    }
  }

  return NextResponse.json({ received: true });
}
