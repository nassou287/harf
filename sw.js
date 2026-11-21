/*
 * Service worker de Harf : rend l'application utilisable hors connexion.
 *
 * Stratégie volontairement simple :
 * - pages HTML : réseau d'abord (pour recevoir les mises à jour), cache si hors ligne ;
 * - fichiers de l'application (JS, CSS, polices, images, audio) : cache d'abord.
 *   Leurs noms changent à chaque nouvelle version, donc pas de risque de version périmée.
 * Les données de progression ne passent JAMAIS par ici : elles restent dans le stockage local.
 */
const CACHE = 'harf-v13'

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(['./', './manifest.webmanifest'])))
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone()
          caches.open(CACHE).then((c) => c.put('./', copy))
          return res
        })
        .catch(() => caches.match('./')),
    )
    return
  }

  event.respondWith(
    caches.match(req).then(
      (hit) =>
        hit ||
        fetch(req).then((res) => {
          if (res.ok) {
            const copy = res.clone()
            caches.open(CACHE).then((c) => c.put(req, copy))
          }
          return res
        }),
    ),
  )
})
