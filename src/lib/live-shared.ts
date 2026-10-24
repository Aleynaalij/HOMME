export type Platform = "kick" | "twitch" | "youtube";

export type LiveStatus = {
  platform: Platform;
  channel: string | null;
  live: boolean;
  /** "api" = detected from the platform, "manual" = Tash flipped the switch, "none" = can't tell */
  source: "api" | "manual" | "none";
  title: string | null;
  viewers: number | null;
  watchUrl: string | null;
};

export const PLATFORM_LABEL: Record<Platform, string> = { kick: "Kick", twitch: "Twitch", youtube: "YouTube" };

export function watchUrl(platform: Platform, channel: string) {
  if (platform === "kick") return `https://kick.com/${channel}`;
  if (platform === "twitch") return `https://www.twitch.tv/${channel}`;
  return channel.startsWith("UC") ? `https://www.youtube.com/channel/${channel}/live` : `https://www.youtube.com/@${channel.replace(/^@/, "")}/live`;
}

/** Player URL. Twitch needs the embedding site's hostname, so this runs in the browser. */
export function embedUrl(platform: Platform, channel: string, host: string) {
  if (platform === "kick") return `https://player.kick.com/${encodeURIComponent(channel)}?autoplay=true&muted=true`;
  if (platform === "twitch") return `https://player.twitch.tv/?channel=${encodeURIComponent(channel)}&parent=${host}&muted=true`;
  return `https://www.youtube.com/embed/live_stream?channel=${encodeURIComponent(channel)}&autoplay=1&mute=1`;
}
