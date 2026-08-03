import type { Notitie, OpenVraag, Signaal, Weekoverzicht } from '../types'

/** localStorage is de bron van waarheid op de telefoon: de app werkt volledig
 *  offline. GitHub is puur transport naar de Mac (zie lib/github.ts). */
const K = {
  notities: 'sportlog.notities',
  wachtrij: 'sportlog.wachtrij',
  instellingen: 'sportlog.instellingen',
  overzicht: 'sportlog.overzicht',
  vraag: 'sportlog.vraag',
  signalen: 'sportlog.signalen',
  gesteldeVragen: 'sportlog.gesteldeVragen',
}

export interface Instellingen {
  token: string
  owner: string
  repo: string
}

const STANDAARD: Instellingen = { token: '', owner: 'jensstijn-pixel', repo: 'sportlog-data' }

function lees<T>(sleutel: string, standaard: T): T {
  try {
    const rauw = localStorage.getItem(sleutel)
    return rauw ? (JSON.parse(rauw) as T) : standaard
  } catch {
    return standaard
  }
}

function schrijf(sleutel: string, waarde: unknown): void {
  try {
    localStorage.setItem(sleutel, JSON.stringify(waarde))
  } catch {
    // Volle of geblokkeerde opslag: liever stil falen dan de app slopen.
  }
}

export const opslag = {
  notities: () => lees<Notitie[]>(K.notities, []),
  zetNotities: (n: Notitie[]) => schrijf(K.notities, n),

  wachtrij: () => lees<string[]>(K.wachtrij, []),
  zetWachtrij: (ids: string[]) => schrijf(K.wachtrij, ids),

  instellingen: (): Instellingen => ({ ...STANDAARD, ...lees(K.instellingen, {}) }),
  zetInstellingen: (i: Instellingen) => schrijf(K.instellingen, i),

  overzicht: () => lees<Record<string, Weekoverzicht>>(K.overzicht, {}),
  zetOverzicht: (o: Record<string, Weekoverzicht>) => schrijf(K.overzicht, o),

  vraag: () => lees<OpenVraag | null>(K.vraag, null),
  zetVraag: (v: OpenVraag | null) => schrijf(K.vraag, v),

  signalen: () => lees<Record<string, Signaal>>(K.signalen, {}),
  zetSignalen: (s: Record<string, Signaal>) => schrijf(K.signalen, s),

  /** Vragen die de app naar de repo stuurde, zodat we ze in de UI kunnen tonen
   *  tot het antwoord binnen is. */
  gesteldeVragen: () => lees<{ vraag: string; op: string }[]>(K.gesteldeVragen, []),
  zetGesteldeVragen: (v: { vraag: string; op: string }[]) => schrijf(K.gesteldeVragen, v),
}

/** Notitie toevoegen of bijwerken; retourneert de nieuwe lijst (nieuwste eerst). */
export function bewaarNotitie(notitie: Notitie): Notitie[] {
  const bestaand = opslag.notities()
  const index = bestaand.findIndex((n) => n.id === notitie.id)
  const nieuw = index >= 0
    ? bestaand.map((n) => (n.id === notitie.id ? notitie : n))
    : [notitie, ...bestaand]
  nieuw.sort((a, b) => (a.tijdstip < b.tijdstip ? 1 : -1))
  opslag.zetNotities(nieuw)

  const wachtrij = opslag.wachtrij()
  if (!wachtrij.includes(notitie.id)) opslag.zetWachtrij([...wachtrij, notitie.id])
  return nieuw
}

export function verwijderNotitie(id: string): Notitie[] {
  const nieuw = opslag.notities().filter((n) => n.id !== id)
  opslag.zetNotities(nieuw)
  opslag.zetWachtrij(opslag.wachtrij().filter((w) => w !== id))
  return nieuw
}

/** Id dat ook als bestandsnaam kan dienen en vanzelf chronologisch sorteert. */
export function nieuwId(): string {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  const stamp =
    `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T` +
    `${p(d.getHours())}-${p(d.getMinutes())}-${p(d.getSeconds())}`
  const staart = Math.floor(Math.random() * 0xffff).toString(16).padStart(4, '0')
  return `${stamp}-${staart}`
}
