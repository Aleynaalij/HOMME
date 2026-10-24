import { NextResponse } from "next/server";
import { notifyAppointment } from "@/lib/notify";

export async function POST(req: Request) {
  const { token, event } = await req.json().catch(() => ({}));
  if (typeof token !== "string" || !/^[a-f0-9]{36}$/.test(token) || (event !== "booked" && event !== "cancelled")) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  await notifyAppointment(token, event);
  return NextResponse.json({ ok: true });
}
