import { brand } from "@/lib/config";
import { getServerClient } from "@/lib/supabase";
import type { PublicAppointment } from "@/lib/types";

const stamp = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const { data } = await getServerClient().rpc("get_appointment_by_token", { p_token: token });
  const a = (data as PublicAppointment[] | null)?.[0];
  if (!a) return new Response("Not found", { status: 404 });

  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Homme LLC//Booking//EN",
    "BEGIN:VEVENT",
    `UID:${a.id}@homme`,
    `DTSTAMP:${stamp(new Date().toISOString())}`,
    `DTSTART:${stamp(a.starts_at)}`,
    `DTEND:${stamp(a.ends_at)}`,
    `SUMMARY:${a.services.map((s) => s.name).join(" + ")} with ${brand.barber} (HOMME)`,
    `LOCATION:${brand.address.join(", ").replace(/,/g, "\\,")}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  return new Response(ics, {
    headers: { "Content-Type": "text/calendar; charset=utf-8", "Content-Disposition": 'attachment; filename="homme-appointment.ics"' },
  });
}
