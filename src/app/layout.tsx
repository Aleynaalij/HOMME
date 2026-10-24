import type { Metadata, Viewport } from "next";
import { Bodoni_Moda, Manrope } from "next/font/google";
import "./globals.css";

const bodoni = Bodoni_Moda({ variable: "--font-bodoni", subsets: ["latin"], weight: ["500", "700", "800"] });
const manrope = Manrope({ variable: "--font-manrope", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: "HOMME — Tash the Barber | Camp Springs, MD",
  description:
    "Book with Tash at Homme LLC — 20+ years cutting all hair types and textures for men, women, and children. Signature Salon Suites, Camp Springs, MD.",
  icons: { icon: "/icon-512.png", apple: "/apple-touch-icon.png" },
  openGraph: {
    title: "HOMME — Who's your barber?",
    description: "Book your next cut with Tash in Camp Springs, MD.",
    images: ["/icon-512.png"],
  },
};

export const viewport: Viewport = { themeColor: "#050505" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${bodoni.variable} ${manrope.variable} antialiased`}>{children}</body>
    </html>
  );
}
