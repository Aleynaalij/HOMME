import type { Metadata } from "next";
import { getServerClient } from "@/lib/supabase";
import type { BusinessHours } from "@/lib/types";
import { LiveView } from "./LiveView";

export const metadata: Metadata = {
  title: "Watch Tash Live — HOMME",
  description: "Tune in live from the chair at HOMME in Camp Springs, MD — cuts, fades and barbershop talk.",
};
export const revalidate = 60;

export default async function LivePage() {
  const { data } = await getServerClient().from("business_hours").select("*").order("weekday");
  return <LiveView hours={(data ?? []) as BusinessHours[]} />;
}
