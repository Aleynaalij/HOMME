import { NextResponse } from "next/server";
import { clearLiveCache, getLiveStatus } from "@/lib/live";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const fresh = new URL(req.url).searchParams.has("fresh");
  if (fresh) clearLiveCache();
  const status = await getLiveStatus();
  return NextResponse.json(status, {
    headers: { "Cache-Control": fresh ? "no-store" : "public, s-maxage=30, stale-while-revalidate=30" },
  });
}
