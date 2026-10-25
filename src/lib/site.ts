import { getServerClient } from "./supabase";
import { addDays, shopNow, ymdWeekday } from "./format";
import type { BusinessHours, Review, Service } from "./types";

export type GalleryPhoto = { id: string; path: string; caption: string | null };

/** Everything the public pages need, in one round of parallel queries. */
export async function getSiteData() {
  const sb = getServerClient();
  const [services, hours, reviews, settings, photos] = await Promise.all([
    sb.from("services").select("*").eq("active", true).order("sort_order"),
    sb.from("business_hours").select("*").order("weekday"),
    sb.from("reviews").select("*").eq("published", true).order("created_at", { ascending: false }),
    sb.from("settings").select("site_banner, waitlist_enabled").eq("id", 1).single(),
    // "The work" is only for photos Tash uploads (skip files bundled with the site)
    sb.from("gallery_photos").select("id, path, caption").not("path", "like", "/%").order("created_at", { ascending: false }).limit(12),
  ]);
  const h = (hours.data ?? []) as BusinessHours[];
  return {
    services: (services.data ?? []) as Service[],
    hours: h,
    reviews: (reviews.data ?? []) as Review[],
    banner: (settings.data?.site_banner as string | null) ?? null,
    waitlistEnabled: settings.data?.waitlist_enabled !== false,
    photos: (photos.data ?? []) as GalleryPhoto[],
    nextAvailable: await nextAvailable(h, 30),
  };
}

/** First open slot for a service of `durationMin`, looking up to three weeks ahead. */
export async function nextAvailable(hours: BusinessHours[], durationMin: number): Promise<string | null> {
  const open = new Set(hours.filter((h) => h.is_open).map((h) => h.weekday));
  if (!open.size) return null;
  const today = shopNow().ymd;
  const days = Array.from({ length: 21 }, (_, i) => addDays(today, i)).filter((d) => open.has(ymdWeekday(d)));
  const sb = getServerClient();
  const results = await Promise.all(
    days.map((d) => sb.rpc("get_available_slots", { p_date: d, p_duration_min: durationMin }).then((r) => (r.data as string[] | null)?.[0] ?? null)),
  );
  return results.find(Boolean) ?? null;
}

export { menuGroups, type MenuGroup } from "./menu";
