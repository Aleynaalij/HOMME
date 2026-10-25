import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "HOMME — Tash the Barber",
    short_name: "HOMME",
    description: "Book with Tash, watch live from the chair, and manage your appointments.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#050505",
    theme_color: "#050505",
    categories: ["lifestyle", "beauty"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Book an appointment", url: "/book", icons: [{ src: "/icon-192.png", sizes: "192x192" }] },
      { name: "Watch live", url: "/live", icons: [{ src: "/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
