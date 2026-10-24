import { getServerClient } from "./supabase";

import { type LiveStatus, type Platform, watchUrl } from "./live-shared";

export type { LiveStatus, Platform };

type Detected = { live: boolean; title: string | null; viewers: number | null } | null;

const tokens = new Map<string, { token: string; exp: number }>();

async function appToken(key: string, url: string, body: Record<string, string>) {
  const cached = tokens.get(key);
  if (cached && cached.exp > Date.now()) return cached.token;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(body),
    cache: "no-store",
  });
  if (!res.ok) return null;
  const json = (await res.json()) as { access_token: string; expires_in: number };
  tokens.set(key, { token: json.access_token, exp: Date.now() + (json.expires_in - 60) * 1000 });
  return json.access_token;
}

async function detectKick(channel: string): Promise<Detected> {
  // Official API (needs a free app at kick.com/settings/developer)
  const id = process.env.KICK_CLIENT_ID;
  const secret = process.env.KICK_CLIENT_SECRET;
  if (id && secret) {
    const token = await appToken("kick", "https://id.kick.com/oauth/token", {
      grant_type: "client_credentials", client_id: id, client_secret: secret,
    });
    if (token) {
      const res = await fetch(`https://api.kick.com/public/v1/channels?slug=${encodeURIComponent(channel)}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (res.ok) {
        const ch = ((await res.json()) as { data?: { stream_title?: string; stream?: { is_live?: boolean; viewer_count?: number } }[] }).data?.[0];
        if (ch) return { live: Boolean(ch.stream?.is_live), title: ch.stream_title ?? null, viewers: ch.stream?.viewer_count ?? null };
      }
    }
  }
  // Fallback: the public channel endpoint (no key, but Kick sometimes blocks servers)
  try {
    const res = await fetch(`https://kick.com/api/v2/channels/${encodeURIComponent(channel)}`, {
      headers: { Accept: "application/json", "User-Agent": "Mozilla/5.0 (compatible; HOMME/1.0)" },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { livestream?: { session_title?: string; viewer_count?: number } | null };
    return { live: Boolean(json.livestream), title: json.livestream?.session_title ?? null, viewers: json.livestream?.viewer_count ?? null };
  } catch {
    return null;
  }
}

async function detectTwitch(channel: string): Promise<Detected> {
  const id = process.env.TWITCH_CLIENT_ID;
  const secret = process.env.TWITCH_CLIENT_SECRET;
  if (!id || !secret) return null;
  const token = await appToken("twitch", "https://id.twitch.tv/oauth2/token", {
    grant_type: "client_credentials", client_id: id, client_secret: secret,
  });
  if (!token) return null;
  const res = await fetch(`https://api.twitch.tv/helix/streams?user_login=${encodeURIComponent(channel)}`, {
    headers: { Authorization: `Bearer ${token}`, "Client-Id": id },
    cache: "no-store",
  });
  if (!res.ok) return null;
  const s = ((await res.json()) as { data: { title: string; viewer_count: number }[] }).data[0];
  return { live: Boolean(s), title: s?.title ?? null, viewers: s?.viewer_count ?? null };
}

async function detectYouTube(channel: string): Promise<Detected> {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key || !channel.startsWith("UC")) return null;
  const res = await fetch(
    `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channel}&eventType=live&type=video&key=${key}`,
    { cache: "no-store" },
  );
  if (!res.ok) return null;
  const item = ((await res.json()) as { items: { snippet: { title: string } }[] }).items[0];
  return { live: Boolean(item), title: item?.snippet.title ?? null, viewers: null };
}

let cache: { at: number; value: LiveStatus } | null = null;
const TTL = 60_000;

export async function getLiveStatus(): Promise<LiveStatus> {
  if (cache && Date.now() - cache.at < TTL) return cache.value;

  const { data } = await getServerClient()
    .from("settings")
    .select("stream_platform, stream_channel, stream_manual_live")
    .eq("id", 1)
    .single();
  const platform = (data?.stream_platform ?? "kick") as Platform;
  const channel = (data?.stream_channel as string | null)?.trim() || null;
  const manual = Boolean(data?.stream_manual_live);

  let value: LiveStatus = { platform, channel, live: false, source: "none", title: null, viewers: null, watchUrl: channel ? watchUrl(platform, channel) : null };
  if (channel) {
    const detected =
      platform === "kick" ? await detectKick(channel) : platform === "twitch" ? await detectTwitch(channel) : await detectYouTube(channel);
    if (detected?.live) value = { ...value, ...detected, live: true, source: "api" };
    else if (manual) value = { ...value, live: true, source: "manual" };
    else if (detected) value = { ...value, source: "api" };
  }

  cache = { at: Date.now(), value };
  return value;
}

/** Drop the cached status (after Tash changes settings). */
export function clearLiveCache() {
  cache = null;
}
