// Foodtruck Finder — Service Worker (network-first, damit Updates sofort erscheinen)
const CACHE = "foodtruck-finder-v10";

// PFLICHT: ohne diese Dateien startet die App nicht. Fehlt eine, soll die
// Installation LAUT scheitern — mit Angabe, welche.
const PFLICHT = [
  "./", "./index.html", "./manifest.webmanifest"
];

// KUER: schoen zu haben. Einzeln geladen, ein Ausfall wird nur vermerkt.
//
// WARUM DIE TRENNUNG:
// Mit einem einzigen cache.addAll([...]) reicht EINE fehlende Datei, damit die
// ganze Installation abbricht. register() meldet trotzdem "erfolgreich" — die
// App laeuft scheinbar normal, nur offline eben nicht, und nichts sagt es dir.
const KUER = [
  "./favicon.ico", "./icons/icon-192.png", "./icons/icon-512.png",
  "./icons/partyretter-maskottchen.png",
  "./datenschutz.html", "./nutzungsbedingungen.html",
  // Sprachen: Deutsch steckt fest in der index.html, braucht also keine Datei.
  // Jede NEUE Sprache hier eintragen, sonst fehlt sie offline.
  "./sprachen/de.json", "./sprachen/en.json", "./sprachen/tr.json",
  "./sprachen/pl.json", "./sprachen/ru.json", "./sprachen/ro.json",
  "./sprachen/ar.json"
];

self.addEventListener("install", (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    try {
      await c.addAll(PFLICHT);
    } catch (err) {
      console.error("[sw] Installation abgebrochen — Pflichtdatei fehlt:", PFLICHT, err);
      throw err;
    }
    await Promise.all(KUER.map((p) =>
      c.add(p).catch(() => console.warn("[sw] Optionale Datei fehlt: " + p))
    ));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Netz zuerst: immer die neueste Version laden, wenn online; offline aus dem Cache.
// API-Aufrufe (partyretter.com) und Kartenkacheln werden NICHT gecacht — die
// Karte braucht Live-Daten, alte Antworten wären irreführend.
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return;
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        // Nur ECHTE Erfolge cachen — sonst landet z. B. GitHubs Störungsseite
        // im Cache und wird nach der Störung weiter angezeigt (03.08.2026 passiert).
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {});
        }
        return res;
      })
      .catch(() => caches.match(e.request).then((m) => m || caches.match("./index.html")))
  );
});
