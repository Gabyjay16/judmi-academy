/* Judmi Academy - Service Worker
   Offline app-shell caching with network-first navigation fallback. */

const version = "judmi-v1.0.0";
const APP_SHELL_CACHE = `${version}-shell`;
const STATIC_CACHE = `${version}-static`;
const RUNTIME_CACHE = `${version}-runtime`;

// Core app-shell URLs to pre-cache (cached when the SW activates/installs).
const APP_SHELL = [
  "/",
  "/login",
  "/signup",
  "/dashboard",
  "/org/dashboard",
  "/dashboard/create",
  "/dashboard/scan-scripts",
  "/dashboard/extract-info",
  "/dashboard/essay-grader",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/maskable-192.png",
  "/icons/maskable-512.png",
  "/icons/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(APP_SHELL_CACHE)
      .then((cache) => cache.addAll(APP_SHELL))
      .catch(() => {})
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => !key.startsWith(version))
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

// Navigation requests (HTML pages): network-first, fall back to served cached copy.
async function handleNavigation(request) {
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, response.clone());
      return response;
    }
    throw new Error("network failed");
  } catch (err) {
    const cached = await caches.match(request);
    if (cached) return cached;
    const shell = await caches.match("/");
    if (shell) return shell;
    return caches.match("/login");
  }
}

// API / non-GET: network only (never cache POST/PATCH/DELETE or /api).
async function handleNetworkOnly(request) {
  return fetch(request);
}

// Static assets (icons, fonts, images): cache-first with runtime fill.
async function handleStatic(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response && response.ok && request.method === "GET") {
    const cache = await caches.open(STATIC_CACHE);
    cache.put(request, response.clone());
  }
  return response;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle same-origin GET requests.
  if (request.method !== "GET" || url.origin !== self.location.origin) {
    return;
  }

  // Never interfere with API routes (they must stay fresh).
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/_next/data/")) {
    return;
  }

  // Local browser navigations => network-first with cache fallback.
  if (request.mode === "navigate") {
    event.respondWith(handleNavigation(request));
    return;
  }

  // Static assets and hashed /_next build files => cache-first.
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    isStaticAsset(url.pathname)
  ) {
    event.respondWith(handleStatic(request));
    return;
  }
});

function isStaticAsset(pathname) {
  return /\.(png|jpe?g|gif|svg|webp|ico|woff2?|ttf|eot|css|js|webmanifest|json)$/i.test(
    pathname
  );
}

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
