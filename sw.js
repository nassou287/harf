/*
 * Service worker de Harf : hors connexion + mises à jour maîtrisées.
 *
 * Ce fichier est un MODÈLE : à la construction (vite build), la ligne `self.__HARF__ = …`
 * est remplie avec le numéro de version et la liste exacte des fichiers de cette version.
 *
 * Stratégie :
 * 1. Installation : TOUS les fichiers de la version sont téléchargés dans un cache propre à
 *    cette version (harf-app-<build>). Si un seul échoue (pas de connexion…), l'installation
 *    échoue et l'ancienne version continue de fonctionner normalement : rien n'est cassé.
 * 2. Attente : la nouvelle version NE s'active PAS toute seule pendant que Harf est ouvert
 *    (pas de skipWaiting automatique). L'application propose « Mettre à jour » au bon moment.
 * 3. Activation : uniquement quand l'apprenant accepte (message SKIP_WAITING), ou quand
 *    Harf a été complètement fermé. Alors seulement, les caches des anciennes versions sont
 *    supprimés.
 * 4. Pendant l'utilisation, chaque page reçoit uniquement les fichiers de SA version :
 *    jamais de mélange entre ancien et nouveau JavaScript/CSS.
 *
 * Les données pédagogiques (progression, profils, copies de secours) sont dans le stockage
 * local et IndexedDB : ce fichier n'y touche JAMAIS. Le nettoyage ne concerne que les caches
 * de fichiers dont le nom commence par « harf- ».
 */
self.__HARF__ = {"version":"0.30.0","build":"0.30.0-mwrvg1u0","files":["apple-touch-icon.png","assets/ad-din-eBD2Gz_-.mp3","assets/al-bayt-CZlhgt-A.mp3","assets/ala-CeJ9LsfP.mp3","assets/alif-B22IWrb0.wav","assets/allah-95SDY0Uy.mp3","assets/ard-nuD2ZEod.mp3","assets/as-salam-DotZcbON.mp3","assets/ayn-BBiEkaJ-.mp3","assets/ba-CJsmFjcc.wav","assets/bab-bOoOxs54.mp3","assets/bahr-CxNtFmOw.mp3","assets/cormorant-garamond-latin-600-normal-Co1r35X9.woff2","assets/dad-DOSPfHSo.mp3","assets/dal-Bh0mLPIE.mp3","assets/dhal-mk0Ke2Ey.mp3","assets/fa-DQc3MdYY.mp3","assets/ghayn-CXDZEjvj.mp3","assets/ha-CbkDwy3s.mp3","assets/haa-DTmeXhJV.mp3","assets/ila-CLtH2Zci.mp3","assets/index-CtbufEYr.css","assets/index-DxtVDBQs.js","assets/isa-DvP0-h1m.mp3","assets/janna-BumO1Wll.mp3","assets/jim-CrKBNtVw.mp3","assets/kaf-DfYC6mSB.mp3","assets/kataba-B_YGZg2P.mp3","assets/kha-CWumo62T.mp3","assets/khayr-CgUgoq7l.mp3","assets/lam-xS6hix2k.mp3","assets/madda-CjBQ7ZrV.mp3","assets/maghrib-uQ1hKIC7.mp3","assets/marida-ZA_WIaWt.mp3","assets/mashriq-BXsgEZiM.mp3","assets/mim-DrN2P9Q4.mp3","assets/muhammad-BzbyQhhg.mp3","assets/nafs-D5ijruoP.mp3","assets/nasara-BKPMZMYm.mp3","assets/noto-naskh-arabic-arabic-400-normal-U_i0HMfG.woff2","assets/noto-naskh-arabic-arabic-700-normal-BdBAMxnO.woff2","assets/noto-naskh-arabic-latin-400-normal-Dajb6q3W.woff2","assets/noto-naskh-arabic-latin-700-normal-CG_vrPqD.woff2","assets/noto-naskh-arabic-latin-ext-400-normal-BbeOg8Tq.woff2","assets/noto-naskh-arabic-latin-ext-700-normal-BdpHOyev.woff2","assets/noto-naskh-arabic-math-400-normal-tNY49amj.woff2","assets/noto-naskh-arabic-math-700-normal-BP-LajJh.woff2","assets/noto-naskh-arabic-symbols-400-normal-BoBMuTRv.woff2","assets/noto-naskh-arabic-symbols-700-normal-s-Hxeun5.woff2","assets/nujum-D-KPSwt5.mp3","assets/nun-DPYc62QI.mp3","assets/nusira-Bu_9xkp6.mp3","assets/qaf-DtSlw4g_.mp3","assets/qala-Dm9bUwOJ.mp3","assets/qawm-DR0U-HcP.mp3","assets/ra-CztltUos.mp3","assets/rabb-_yw1fVuF.mp3","assets/rasul-C_9WLovA.mp3","assets/sad-BuqEqVcO.mp3","assets/sadiq-Dvl05_0L.mp3","assets/shin-Dp-5DOc9.mp3","assets/sin-DCB9i_Gz.mp3","assets/ta-CZP17wwQ.wav","assets/taa-DoU55Xns.mp3","assets/tha-BgoILA0a.mp3","assets/waw-615TVa3Y.mp3","assets/ya-xoTywaRH.mp3","assets/yawm-BAuZLUXN.mp3","assets/zaa-jPbeMTRA.mp3","assets/zay-v3wrfWMc.mp3","icon-192.png","icon-512.png","icon-maskable-512.png","index.html","manifest.webmanifest"]} // remplacé à la construction

const { version: VERSION, build: BUILD, files: FILES } = self.__HARF__
const CACHE = `harf-app-${BUILD}`
const scoped = (path) => new URL(path, self.registration.scope).href
/** Fichiers dont le nom contient une empreinte : identiques d'une version à l'autre si inchangés. */
const isHashed = (path) => /-[A-Za-z0-9_-]{8}\.[a-z0-9]+$/.test(path)

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE)
      for (const path of FILES) {
        const url = scoped(path)
        if (await cache.match(url)) continue
        // Un fichier à empreinte déjà téléchargé par une version précédente est réutilisé : pas de
        // téléchargement inutile. Les autres (index.html, icônes…) sont toujours pris à jour.
        const old = isHashed(path) ? await caches.match(url) : undefined
        const res = old ?? (await fetch(new Request(url, { cache: 'reload' })))
        if (!res.ok) throw new Error(`Téléchargement impossible : ${path} (${res.status})`)
        await cache.put(url, res.clone())
      }
    })(),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys()
      // Uniquement nos caches de fichiers, jamais autre chose.
      await Promise.all(names.filter((n) => n.startsWith('harf-') && n !== CACHE).map((n) => caches.delete(n)))
      await self.clients.claim()
    })(),
  )
})

self.addEventListener('message', (event) => {
  const msg = event.data || {}
  if (msg.type === 'SKIP_WAITING') self.skipWaiting()
  if (msg.type === 'GET_VERSION' && event.ports[0]) event.ports[0].postMessage({ version: VERSION, build: BUILD })
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return

  if (req.mode === 'navigate') {
    // La page vient de la version installée : elle correspond exactement à ses fichiers.
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE)
        return (await cache.match(scoped('index.html'))) ?? fetch(req).catch(() => caches.match(scoped('index.html')))
      })(),
    )
    return
  }

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE)
      const hit = (await cache.match(req, { ignoreSearch: true })) ?? (await caches.match(req, { ignoreSearch: true }))
      if (hit) return hit
      const res = await fetch(req)
      if (res.ok && res.type === 'basic') await cache.put(req, res.clone())
      return res
    })(),
  )
})
