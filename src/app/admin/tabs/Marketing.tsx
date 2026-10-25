"use client";

import QRCode from "qrcode";
import { useEffect, useRef, useState } from "react";
import { brand, siteUrl } from "@/lib/config";
import { APK_URL } from "@/components/InstallApp";
import { Notice, sb } from "../shared";

const TARGETS = [
  { id: "book", label: "Book", url: `${siteUrl}/book`, headline: "SCAN TO BOOK" },
  { id: "home", label: "Website", url: siteUrl, headline: "SCAN TO VISIT" },
  { id: "live", label: "Watch live", url: `${siteUrl}/live`, headline: "SCAN TO WATCH LIVE" },
  { id: "app", label: "Android app", url: APK_URL, headline: "GET THE APP" },
] as const;

type Target = (typeof TARGETS)[number];

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/** Branded flyer: logo, headline, QR, link and address on black. */
async function drawFlyer(canvas: HTMLCanvasElement, t: Target) {
  const W = 1200, H = 1650;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#050505";
  ctx.fillRect(0, 0, W, H);

  const glow = ctx.createRadialGradient(W / 2, 0, 50, W / 2, 0, 900);
  glow.addColorStop(0, "rgba(201,169,106,0.22)");
  glow.addColorStop(1, "rgba(201,169,106,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  const logo = await loadImage("/brand/homme-logo.png");
  const lw = 900, lh = (logo.height / logo.width) * lw;
  ctx.drawImage(logo, (W - lw) / 2, 110, lw, lh);

  ctx.fillStyle = "#c9a96a";
  ctx.font = "700 46px Georgia, serif";
  ctx.textAlign = "center";
  ctx.fillText(t.headline.split("").join(String.fromCharCode(8202)), W / 2, 470);

  const qr = document.createElement("canvas");
  await QRCode.toCanvas(qr, t.url, { width: 640, margin: 2, errorCorrectionLevel: "H", color: { dark: "#000000", light: "#ffffff" } });
  const qx = (W - 700) / 2, qy = 530;
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.roundRect(qx, qy, 700, 700, 36);
  ctx.fill();
  ctx.drawImage(qr, qx + 30, qy + 30, 640, 640);

  ctx.fillStyle = "#f5f3ef";
  ctx.font = "600 36px system-ui, sans-serif";
  ctx.fillText(t.url.replace(/^https?:\/\//, "").replace(/\/releases.*$/, ""), W / 2, 1320);
  ctx.fillStyle = "#9a9690";
  ctx.font = "32px system-ui, sans-serif";
  ctx.fillText(`${brand.barber} · ${brand.suite}`, W / 2, 1420);
  ctx.fillText(brand.address.join(", "), W / 2, 1470);
  ctx.fillText(`IG ${brand.instagramHandle}  ·  TikTok ${brand.tiktokHandle}`, W / 2, 1540);
}

export function Marketing() {
  const [target, setTarget] = useState<Target>(TARGETS[0]);
  const [qrUrl, setQrUrl] = useState<string>("");
  const flyerRef = useRef<HTMLCanvasElement>(null);
  const [banner, setBanner] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    QRCode.toDataURL(target.url, { width: 1024, margin: 2, errorCorrectionLevel: "H" }).then(setQrUrl);
    if (flyerRef.current) drawFlyer(flyerRef.current, target);
  }, [target]);

  useEffect(() => {
    sb().from("settings").select("site_banner").eq("id", 1).single().then(({ data }) => setBanner((data?.site_banner as string | null) ?? ""));
  }, []);

  function download(href: string, name: string) {
    const a = document.createElement("a");
    a.href = href;
    a.download = name;
    a.click();
  }

  async function share() {
    if (navigator.share) await navigator.share({ title: "Book with Tash at HOMME", url: target.url }).catch(() => {});
    else {
      await navigator.clipboard.writeText(target.url);
      setMsg("Link copied");
    }
  }

  async function saveBanner(text: string) {
    const { error } = await sb().from("settings").update({ site_banner: text.trim() || null }).eq("id", 1);
    setBanner(text);
    setMsg(error ? error.message : text.trim() ? "Banner is live on the website (within a minute)." : "Banner removed.");
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="card p-5">
        <h2 className="font-display text-2xl font-bold">QR code</h2>
        <p className="mt-1 text-sm text-muted">Print it for your mirror, station, business cards or flyers. Clients scan and land right where you want them.</p>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {TARGETS.map((t) => (
            <button key={t.id} onClick={() => setTarget(t)}
              className={`rounded-xl border py-2 text-sm font-semibold ${target.id === t.id ? "border-gold bg-gold/10" : "border-line hover:border-muted"}`}>
              {t.label}
            </button>
          ))}
        </div>
        {qrUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={qrUrl} alt={`QR code for ${target.url}`} className="mx-auto mt-5 w-56 rounded-2xl bg-white p-2" />
        )}
        <p className="mt-3 break-all text-center text-xs text-muted">{target.url}</p>
        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          <button className="btn-primary !px-3" onClick={() => flyerRef.current && download(flyerRef.current.toDataURL("image/png"), `homme-${target.id}-flyer.png`)}>Flyer</button>
          <button className="btn-ghost" onClick={() => download(qrUrl, `homme-${target.id}-qr.png`)}>QR only</button>
          <button className="btn-ghost" onClick={share}>Share link</button>
        </div>
      </section>

      <section className="card p-5">
        <h2 className="font-display text-2xl font-bold">Flyer preview</h2>
        <canvas ref={flyerRef} className="mt-4 w-full rounded-2xl border border-line" />
      </section>

      <section className="card p-5 lg:col-span-2">
        <h2 className="font-display text-2xl font-bold">Website announcement</h2>
        <p className="mt-1 text-sm text-muted">A gold bar across the top of your website. Great for holiday hours, specials or “new openings Saturday.”</p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <input className="input" placeholder="e.g. Closed Thanksgiving weekend — book early!" maxLength={140} value={banner} onChange={(e) => setBanner(e.target.value)} />
          <button className="btn-primary shrink-0" onClick={() => saveBanner(banner)}>Publish</button>
          {banner && <button className="btn-ghost shrink-0" onClick={() => saveBanner("")}>Remove</button>}
        </div>
        {msg && <div className="mt-3"><Notice msg={msg} /></div>}
      </section>
    </div>
  );
}
