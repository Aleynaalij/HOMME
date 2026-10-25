import type { Metadata } from "next";
import { getServerClient } from "@/lib/supabase";
import type { BusinessHours, Service } from "@/lib/types";
import { BookingFlow } from "./BookingFlow";

export const metadata: Metadata = { title: "Book with Tash — HOMME" };
export const revalidate = 60;

export default async function BookPage({ searchParams }: { searchParams: Promise<{ service?: string; services?: string }> }) {
  const { service, services: serviceList } = await searchParams;
  const initialServiceIds = (serviceList ?? service ?? "").split(",").filter(Boolean).slice(0, 10);
  const sb = getServerClient();
  const [services, hours, settings] = await Promise.all([
    sb.from("services").select("*").eq("active", true).order("sort_order"),
    sb.from("business_hours").select("*").order("weekday"),
    sb.from("settings").select("waitlist_enabled").eq("id", 1).single(),
  ]);
  return (
    <BookingFlow
      services={(services.data ?? []) as Service[]}
      hours={(hours.data ?? []) as BusinessHours[]}
      initialServiceIds={initialServiceIds}
      cardEnabled={Boolean(process.env.STRIPE_SECRET_KEY)}
      waitlistEnabled={settings.data?.waitlist_enabled !== false}
    />
  );
}
