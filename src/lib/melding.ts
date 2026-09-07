import { opslag } from './opslag'
import { schrijfBestand } from './github'

/** Pushmeldingen aanzetten.
 *
 *  De keten: deze app vraagt toestemming en maakt een abonnement bij Apple of
 *  Google, schrijft dat abonnement naar de data-repo, en de Mac gebruikt het
 *  's ochtends om een melding te sturen. Er staat dus geen server tussen —
 *  de Mac die de brief maakt stuurt zelf de push.
 *
 *  **De toestemmingsvraag krijg je maar één keer.** Tikt iemand op "niet
 *  toestaan", dan is dat alleen nog diep in de iOS-instellingen terug te
 *  draaien. Vandaar dat de app eerst zelf uitlegt wat je krijgt en pas daarna
 *  de systeemvraag stelt. */

/** Publieke helft van het VAPID-sleutelpaar. De private helft staat op de Mac
 *  in Daily-app/data/vapid.json en komt hier nooit. */
const VAPID_PUBLIEK = 'BKQ1ORLpVrpgWLb5VuHRm0hDdSA9KMRpnCyzRa0RGeflX3Vz_B2py6q9t9HBhp-kCsodkY_crIcURFPKsHHGZEo'

export type MeldingStand =
  | 'kan-niet'      // browser of toestel ondersteunt het niet
  | 'niet-gevraagd' // nog geen toestemming gevraagd
  | 'geweigerd'     // toestemming geweigerd; alleen via instellingen terug
  | 'aan'           // toestemming gegeven en abonnement bekend

function base64NaarBytes(base64: string): Uint8Array {
  const vol = (base64 + '='.repeat((4 - (base64.length % 4)) % 4))
    .replace(/-/g, '+')
    .replace(/_/g, '/')
  const rauw = atob(vol)
  return Uint8Array.from(rauw, (c) => c.charCodeAt(0))
}

export function meldingStand(): MeldingStand {
  if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
    return 'kan-niet'
  }
  if (Notification.permission === 'denied') return 'geweigerd'
  if (Notification.permission === 'granted') return 'aan'
  return 'niet-gevraagd'
}

/** Korte, stabiele naam voor het abonnementsbestand.
 *
 *  Per toestel één bestand, zodat een tweede telefoon het eerste abonnement
 *  niet overschrijft. De endpoint-URL is uniek per toestel; daar maken we een
 *  korte hash van, want de volledige URL is te lang voor een bestandsnaam. */
async function bestandsnaam(endpoint: string): Promise<string> {
  const bytes = new TextEncoder().encode(endpoint)
  const hash = await crypto.subtle.digest('SHA-256', bytes)
  return [...new Uint8Array(hash)]
    .slice(0, 8)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/** Vraagt toestemming, maakt het abonnement en schrijft het naar de repo.
 *  Geeft een korte melding terug die je aan de gebruiker kunt tonen. */
export async function zetMeldingenAan(): Promise<{ ok: boolean; tekst: string }> {
  if (meldingStand() === 'kan-niet') {
    return {
      ok: false,
      tekst: 'Dit toestel ondersteunt geen meldingen. Op de iPhone werkt het alleen als de app op je beginscherm staat.',
    }
  }

  const inst = opslag.instellingen()
  if (!inst.token) {
    return { ok: false, tekst: 'Koppel de app eerst aan de data-repo; anders kan de Mac je niet bereiken.' }
  }

  const toestemming = await Notification.requestPermission()
  if (toestemming !== 'granted') {
    return {
      ok: false,
      tekst:
        toestemming === 'denied'
          ? 'Meldingen zijn geweigerd. Terugdraaien kan via Instellingen → Meldingen → Sportlog.'
          : 'Geen toestemming gegeven.',
    }
  }

  const reg = await navigator.serviceWorker.ready
  // Een bestaand abonnement hergebruiken: opnieuw abonneren zou een nieuwe
  // endpoint geven en het oude bestand in de repo laten rondslingeren.
  const abonnement =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: base64NaarBytes(VAPID_PUBLIEK) as BufferSource,
    }))

  const rauw = abonnement.toJSON()
  const naam = await bestandsnaam(abonnement.endpoint)
  await schrijfBestand(
    inst,
    `meldingen/${naam}.json`,
    JSON.stringify(
      {
        endpoint: rauw.endpoint,
        keys: rauw.keys,
        toestel: navigator.userAgent.slice(0, 80),
        aangemeld: new Date().toISOString(),
      },
      null,
      2,
    ) + '\n',
    'Meldingen aangezet op een toestel',
  )

  return {
    ok: true,
    tekst: 'Meldingen staan aan. Je krijgt er \'s ochtends één zodra de brief klaar is.',
  }
}

/** Test: toont meteen een melding via de service worker, zonder de Mac.
 *  Handig om te zien of de keten in de app zelf klopt. */
export async function testMelding(): Promise<void> {
  const reg = await navigator.serviceWorker.ready
  await reg.showNotification('Sportlog', {
    body: 'Zo ziet je ochtendmelding eruit.',
    icon: '/sportlog-app/icon-192.png',
    tag: 'test',
  })
}
