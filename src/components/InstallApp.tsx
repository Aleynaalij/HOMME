"use client";

import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

export const APK_URL = "https://github.com/Aleynaalij/HOMME/releases/latest/download/homme.apk";

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
export function InstallApp() {
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
    <div className="card mx-auto flex max-w-xl flex-col items-center gap-4 p-6 text-center">
      <div>
        <p className="font-display text-2xl font-bold">Get the HOMME app</p>
        <p className="mt-1 text-sm text-muted">
          {platform === "ios"
            ? "On iPhone: tap the Share button, then “Add to Home Screen”."
            : "Book faster and catch Tash live — right from your home screen."}
        </p>
      </div>
      {platform !== "ios" && (
        <div className="flex flex-wrap justify-center gap-2">
          {prompt && <button onClick={install} className="btn-primary">Install app</button>}
          {platform === "android" && (
            <a href={APK_URL} className={prompt ? "btn-ghost" : "btn-primary"}>Download for Android (APK)</a>
          )}
        </div>
      )}
    </div>
  );
}
