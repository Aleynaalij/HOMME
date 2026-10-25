"use client";

import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

export const APK_URL = "https://github.com/Aleynaalij/HOMME/releases/latest/download/homme.apk";
export const ADMIN_APK_URL = "https://github.com/Aleynaalij/HOMME/releases/latest/download/homme-admin.apk";

/** Registers the service worker once per page load. */
export function ServiceWorker() {
  useEffect(() => {
    if ("serviceWorker" in navigator && location.protocol === "https:") {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);
  return null;
}

/** "Get the app" card: native install prompt on Android/Chrome, instructions on iPhone, APK download fallback. */
export function InstallApp({
  title = "Get the HOMME app",
  blurb = "Book faster and catch Tash live — right from your home screen.",
  apkUrl = APK_URL,
}: { title?: string; blurb?: string; apkUrl?: string } = {}) {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [platform, setPlatform] = useState<"android" | "ios" | "other" | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent;
    setPlatform(/android/i.test(ua) ? "android" : /iphone|ipad|ipod/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1) ? "ios" : "other");
    setInstalled(window.matchMedia("(display-mode: standalone)").matches);
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setPrompt(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setInstalled(true);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed || platform === null) return null;

  async function install() {
    if (!prompt) return;
    await prompt.prompt();
    await prompt.userChoice;
    setPrompt(null);
  }

  return (
    <div className="lux-card mx-auto flex max-w-xl flex-col items-center gap-4 p-7 text-center">
      <div>
        <p className="font-display text-2xl font-bold">{title}</p>
        <p className="mt-1 text-sm text-muted">
          {platform === "ios"
            ? "On iPhone: tap the Share button, then “Add to Home Screen”."
            : blurb}
        </p>
      </div>
      {platform !== "ios" && (
        <div className="flex flex-wrap justify-center gap-2">
          {prompt && <button onClick={install} className="btn-gold">Install app</button>}
          {platform === "android" && (
            <a href={apkUrl} className={prompt ? "btn-line" : "btn-gold"}>Download for Android (APK)</a>
          )}
        </div>
      )}
    </div>
  );
}
