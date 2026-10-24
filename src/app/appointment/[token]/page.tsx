import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getServerClient } from "@/lib/supabase";
import type { PublicAppointment } from "@/lib/types";
import { AppointmentView } from "./AppointmentView";

export const metadata: Metadata = { title: "Your appointment — HOMME", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function AppointmentPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ new?: string; paid?: string; canceled_payment?: string }>;
}) {
  const { token } = await params;
  const sp = await searchParams;
  const { data } = await getServerClient().rpc("get_appointment_by_token", { p_token: token });
  const appt = (data as PublicAppointment[] | null)?.[0];
  if (!appt) notFound();

  return (
    <AppointmentView
      token={token}
      appt={appt}
      isNew={sp.new === "1"}
      justPaid={sp.paid === "1"}
      paymentCanceled={sp.canceled_payment === "1"}
      cardEnabled={Boolean(process.env.STRIPE_SECRET_KEY)}
    />
  );
}
