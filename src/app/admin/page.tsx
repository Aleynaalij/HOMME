import type { Metadata } from "next";
import { AdminApp } from "./AdminApp";

export const metadata: Metadata = { title: "Owner dashboard — HOMME", robots: { index: false } };

export default function AdminPage() {
  return <AdminApp />;
}
