/// <reference lib="webworker" />
import {
  cleanupOutdatedCaches,
  createHandlerBoundToURL,
  precacheAndRoute,
} from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'
import { clientsClaim } from 'workbox-core'

/** Eigen service worker, in plaats van de standaard die vite-plugin-pwa
 *  genereert. Reden: pushmeldingen. De rest van het gedrag blijft gelijk —
 *  precachen, oude caches opruimen, en meteen de nieuwe versie activeren
 *  (dat is wat `registerType: 'autoUpdate'` eerder deed).
 *
 *  Let op bij wijzigen: dit bestand is óók de offline-laag van de app. Sloop je
 *  de precache-regels hieronder, dan werkt de app niet meer zonder netwerk. */

declare const self: ServiceWorkerGlobalScope

// __WB_MANIFEST wordt door de build vervangen door de lijst bestanden.
precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()

/** Offline-terugval voor navigatie.
 *
 *  Dit deed de gegenereerde service worker automatisch; met een eigen worker
 *  moet het er zelf in. Zonder deze regel opent de app zonder netwerk
 *  helemaal niet: het verzoek om de pagina gaat dan naar het netwerk en
 *  faalt, terwijl index.html gewoon in de cache staat. */
registerRoute(new NavigationRoute(createHandlerBoundToURL('/sportlog-app/index.html')))

self.skipWaiting()
clientsClaim()

interface PushInhoud {
  titel?: string
  tekst?: string
  /** Waar de app naartoe moet als je op de melding tikt. */
  pad?: string
  tag?: string
}

self.addEventListener('push', (event) => {
  let inhoud: PushInhoud = {}
  try {
    inhoud = event.data ? (event.data.json() as PushInhoud) : {}
  } catch {
    // Geen geldige JSON: dan tonen we een melding met de kale tekst, want een
    // stille push is verwarrender dan een korte melding.
    inhoud = { tekst: event.data?.text() }
  }

  const titel = inhoud.titel ?? 'Sportlog'
  event.waitUntil(
    self.registration.showNotification(titel, {
      body: inhoud.tekst ?? '',
      icon: '/sportlog-app/icon-192.png',
      badge: '/sportlog-app/icon-192.png',
      // Zelfde tag = de melding van gisteren wordt vervangen in plaats van
      // dat er een stapel ontstaat.
      tag: inhoud.tag ?? 'ochtend',
      data: { pad: inhoud.pad ?? '/sportlog-app/' },
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const pad = (event.notification.data as { pad?: string })?.pad ?? '/sportlog-app/'

  event.waitUntil(
    (async () => {
      const vensters = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      // Staat de app al open, breng die naar voren in plaats van een tweede
      // exemplaar te openen.
      for (const v of vensters) {
        if (v.url.includes('/sportlog-app/') && 'focus' in v) {
          await v.focus()
          return
        }
      }
      await self.clients.openWindow(pad)
    })(),
  )
})
