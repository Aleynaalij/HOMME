import { NextResponse } from "next/server";
import { runDailyJobs } from "@/lib/notify";

// Called daily by Vercel Cron (see vercel.json), which sends `Authorization: Bearer $CRON_SECRET`.
export async function GET(req: Request) {
  if (!process.env.CRON_SECRET || req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json(await runDailyJobs());
}
