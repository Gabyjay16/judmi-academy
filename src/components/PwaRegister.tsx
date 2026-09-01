"use client";

import { useEffect, useState, useCallback } from "react";
import { X } from "lucide-react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "judmi_install_prompt_dismissed_at";
const DISMISS_WINDOW_MS = 30 * 24 * 60 * 60 * 1000; // don't re-prompt for 30 days

export default function PwaRegister() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [dismissed, setDismissed] = useState(true);
  const [ready, setReady] = useState(false);

  const isStandalone = () =>
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as any).standalone === true;

  useEffect(() => {
    if (isStandalone()) {
      setInstalled(true);
      return;
    }

    // Respect a previous dismissal so the banner does not nag on every visit.
    try {
      const t = Number(localStorage.getItem(DISMISS_KEY) || 0);
      setDismissed(Date.now() - t < DISMISS_WINDOW_MS);
    } catch {
      setDismissed(false);
    }
    setReady(true);

    const ua = window.navigator.userAgent;
    const ios = /iphone|ipad|ipod/i.test(ua);
    setIsIos(ios);

    const onBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const onAppInstalled = () => {
      setInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);

    // Register the service worker (best-effort; silent on failure).
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, []);

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === "accepted") {
      setInstalled(true);
    }
    setDeferredPrompt(null);
  }, [deferredPrompt]);

  const handleDismiss = useCallback(() => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {}
    setDismissed(true);
  }, []);

  // Hide when installed, when the user dismissed it, or on desktop where
  // neither the browser prompt nor the iOS hint applies.
  if (installed || dismissed || (!deferredPrompt && !isIos)) return null;
  if (!ready) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-sm px-4">
      <div className="relative flex items-center gap-3 rounded-2xl border border-indigo-200 bg-white/95 shadow-xl shadow-indigo-100 backdrop-blur p-3">
        <button
          onClick={handleDismiss}
          aria-label="Dismiss"
          className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-slate-800 text-white shadow-md transition hover:bg-slate-700"
        >
          <X className="w-3.5 h-3.5" />
        </button>
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-white font-black text-lg shadow">
          J
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-800">
            {isIos && !deferredPrompt ? "Install Judmi Academy" : "Install the app"}
          </p>
          <p className="text-xs text-slate-500 truncate">
            {isIos && !deferredPrompt
              ? "Tap Share, then \u201cAdd to Home Screen\u201d."
              : "Add to your home screen for quick access \u2014 works offline."}
          </p>
        </div>
        {deferredPrompt && (
          <button
            onClick={handleInstall}
            className="shrink-0 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-indigo-700"
          >
            Install
          </button>
        )}
      </div>
    </div>
  );
}