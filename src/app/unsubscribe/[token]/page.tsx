import type { Metadata } from "next";
import { UnsubscribeView } from "./UnsubscribeView";

export const metadata: Metadata = { title: "Unsubscribe — HOMME", robots: { index: false } };

export default async function Unsubscribe({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <UnsubscribeView token={token} />;
}
