import type { Metadata } from "next";
import { AdminApp } from "./AdminApp";

export const metadata: Metadata = {
  title: "HOMME Admin",
  robots: { index: false },
  manifest: "/admin.webmanifest",
  icons: { icon: "/admin-icon-192.png", apple: "/admin-apple-touch-icon.png" },
  appleWebApp: { capable: true, title: "HOMME Admin", statusBarStyle: "black-translucent" },
};

export default function AdminPage() {
  return <AdminApp />;
}
