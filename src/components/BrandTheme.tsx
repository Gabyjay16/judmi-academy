"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

interface Branding {
  brandName: string;
  brandColor: string;
  logoData: string | null;
}

// ---- color helpers ----
function trimHash(hex: string): string {
  return hex.replace("#", "");
}

function clamp(n: number): number {
  return Math.max(0, Math.min(255, n));
}

function shade(hex: string, percent: number): string {
  const clean = trimHash(hex);
  let r = parseInt(clean.slice(0, 2), 16);
  let g = parseInt(clean.slice(2, 4), 16);
  let b = parseInt(clean.slice(4, 6), 16);
  if (percent < 0) {
    const t = 1 + percent / 100;
    r = clamp(Math.round(r * t));
    g = clamp(Math.round(g * t));
    b = clamp(Math.round(b * t));
  } else {
    const t = percent / 100;
    r = clamp(Math.round(r * (1 - t)));
    g = clamp(Math.round(g * (1 - t)));
    b = clamp(Math.round(b * (1 - t)));
  }
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

function tint(hex: string, percent: number): string {
  // Mix with white.
  const clean = trimHash(hex);
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  const t = percent / 100;
  const nr = clamp(Math.round(r + (255 - r) * t));
  const ng = clamp(Math.round(g + (255 - g) * t));
  const nb = clamp(Math.round(b + (255 - b) * t));
  return `#${((1 << 24) + (nr << 16) + (ng << 8) + nb).toString(16).slice(1)}`;
}

function luminance(hex: string): number {
  const clean = trimHash(hex);
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

function getBranding(): Branding | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("judmi_user");
    if (!raw) return null;
    const user = JSON.parse(raw);
    if (!user?.branding?.brandColor) return null;
    const bc = /^#[0-9a-fA-F]{6}$/.test(user.branding.brandColor) ? user.branding.brandColor : "#4f46e5";
    return {
      brandName: user.branding.brandName || user.organizationName || "School",
      brandColor: bc,
      logoData: user.branding.logoData || null,
    };
  } catch {
    return null;
  }
}

function buildCss(b: Branding): string {
  const base = b.brandColor;
  const fifty = tint(base, 94);
  const oneHundred = tint(base, 86);
  const twoHundred = tint(base, 72);
  const fiveHundred = base;
  const sixHundred = shade(base, 12);
  const sevenHundred = shade(base, 24);
  const eightHundred = shade(base, 34);
  const contrast = luminance(base) > 186 ? "#1e293b" : "#ffffff";

  return `
    :root {
      --brand: ${fiveHundred};
      --brand-50: ${fifty};
      --brand-100: ${oneHundred};
      --brand-200: ${twoHundred};
      --brand-500: ${fiveHundred};
      --brand-600: ${sixHundred};
      --brand-700: ${sevenHundred};
      --brand-800: ${eightHundred};
      --brand-contrast: ${contrast};
    }
    /* Map the app's indigo accents to the school brand color */
    .bg-indigo-50 { background-color: ${fifty} !important; }
    .bg-indigo-100 { background-color: ${oneHundred} !important; }
    .bg-indigo-500 { background-color: ${fiveHundred} !important; }
    .bg-indigo-600 { background-color: ${sixHundred} !important; }
    .bg-indigo-700 { background-color: ${sevenHundred} !important; }
    .bg-indigo-800 { background-color: ${eightHundred} !important; }
    .from-indigo-600 { --tw-gradient-from: ${sixHundred}; --tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-to, rgba(67,56,202,0)); }
    .to-indigo-500 { --tw-gradient-to: ${fiveHundred}; }
    .from-indigo-500 { --tw-gradient-from: ${fiveHundred}; --tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-to, rgba(99,102,241,0)); }
    .to-indigo-700 { --tw-gradient-to: ${sevenHundred}; }
    .text-indigo-50 { color: ${fifty} !important; }
    .text-indigo-100 { color: ${oneHundred} !important; }
    .text-indigo-200 { color: ${twoHundred} !important; }
    .text-indigo-300 { color: ${tint(base, 40)} !important; }
    .text-indigo-400 { color: ${tint(base, 20)} !important; }
    .text-indigo-500 { color: ${fiveHundred} !important; }
    .text-indigo-600 { color: ${sixHundred} !important; }
    .text-indigo-700 { color: ${sevenHundred} !important; }
    .text-indigo-800 { color: ${eightHundred} !important; }
    .ring-indigo-500 { --tw-ring-opacity: 1; --tw-ring-color: ${fiveHundred}; }
    .focus\\:ring-indigo-500:focus { --tw-ring-opacity: 1; --tw-ring-color: ${fiveHundred}; }
    .border-indigo-200 { border-color: ${twoHundred} !important; }
    .border-indigo-300 { border-color: ${tint(base, 40)} !important; }
    .shadow-indigo-500\\/20 { --tw-shadow-color: ${fiveHundred}33; }
    .shadow-indigo-100 { --tw-shadow-color: ${oneHundred}66; }
    .ring-indigo-600 { --tw-ring-opacity: 1; --tw-ring-color: ${sixHundred}; }
  `;
}

export default function BrandTheme() {
  const pathname = usePathname();
  const [css, setCss] = useState<string>("");

  useEffect(() => {
    const branding = getBranding();
    if (branding) {
      setCss(buildCss(branding));
      const root = document.documentElement;
      root.style.setProperty("--brand", branding.brandColor);
      root.style.setProperty("--brand-600", shade(branding.brandColor, 12));
    } else {
      setCss("");
      const root = document.documentElement;
      root.style.removeProperty("--brand");
      root.style.removeProperty("--brand-50");
      root.style.removeProperty("--brand-100");
      root.style.removeProperty("--brand-200");
      root.style.removeProperty("--brand-500");
      root.style.removeProperty("--brand-600");
      root.style.removeProperty("--brand-700");
      root.style.removeProperty("--brand-800");
      root.style.removeProperty("--brand-contrast");
    }
  }, [pathname]);

  if (!css) return null;
  // eslint-disable-next-line @next/next/no-css-tags
  return <style dangerouslySetInnerHTML={{ __html: css }} />;
}
