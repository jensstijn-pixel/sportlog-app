import type { Dagbrief, Dataset, FinancienDuiding, Herstel, Notitie, OpenVraag, Post, Schermtijd, Signaal, Taak, Verrijking, Weekoverzicht } from '../types'

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
  taken: 'sportlog.taken',
  takenWachtrij: 'sportlog.takenWachtrij',
  verrijking: 'sportlog.verrijking',
  herstel: 'sportlog.herstel',
  herstelWachtrij: 'sportlog.herstelWachtrij',
  schermtijd: 'sportlog.schermtijd',
  schermtijdWachtrij: 'sportlog.schermtijdWachtrij',
  dataset: 'sportlog.dataset',
  posten: 'sportlog.posten',
  postenWachtrij: 'sportlog.postenWachtrij',
  financienDuiding: 'sportlog.financienDuiding',
  brief: 'sportlog.brief',
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

  taken: () => lees<Taak[]>(K.taken, []),
  zetTaken: (t: Taak[]) => schrijf(K.taken, t),

  takenWachtrij: () => lees<string[]>(K.takenWachtrij, []),
  zetTakenWachtrij: (ids: string[]) => schrijf(K.takenWachtrij, ids),

  /** Categorie en prioriteit per taak-id, ingevuld door de Mac. */
  verrijking: () => lees<Record<string, Verrijking>>(K.verrijking, {}),
  zetVerrijking: (v: Record<string, Verrijking>) => schrijf(K.verrijking, v),

  /** Handmatig overgenomen Oura-cijfers, per datum. */
  herstel: () => lees<Record<string, Herstel>>(K.herstel, {}),
  zetHerstel: (h: Record<string, Herstel>) => schrijf(K.herstel, h),

  herstelWachtrij: () => lees<string[]>(K.herstelWachtrij, []),
  zetHerstelWachtrij: (datums: string[]) => schrijf(K.herstelWachtrij, datums),

  /** Handmatig overgenomen schermtijd, per datum. */
  schermtijd: () => lees<Record<string, Schermtijd>>(K.schermtijd, {}),
  zetSchermtijd: (s: Record<string, Schermtijd>) => schrijf(K.schermtijd, s),

  schermtijdWachtrij: () => lees<string[]>(K.schermtijdWachtrij, []),
  zetSchermtijdWachtrij: (datums: string[]) => schrijf(K.schermtijdWachtrij, datums),

  /** Doorgerekende reeksen voor het Tracking-scherm (door de Mac gemaakt). */
  dataset: () => lees<Dataset | null>(K.dataset, null),
  zetDataset: (d: Dataset) => schrijf(K.dataset, d),

  /** Geldposten: uitgaven en inkomsten, nieuwste eerst. */
  posten: () => lees<Post[]>(K.posten, []),
  zetPosten: (p: Post[]) => schrijf(K.posten, p),

  postenWachtrij: () => lees<string[]>(K.postenWachtrij, []),
  zetPostenWachtrij: (ids: string[]) => schrijf(K.postenWachtrij, ids),

  /** Vaste lasten die de Mac herkende. */
  financienDuiding: () => lees<FinancienDuiding | null>(K.financienDuiding, null),
  zetFinancienDuiding: (d: FinancienDuiding) => schrijf(K.financienDuiding, d),

  /** De ochtendbrief van vandaag, door de Mac geschreven. */
  brief: () => lees<Dagbrief | null>(K.brief, null),
  zetBrief: (b: Dagbrief) => schrijf(K.brief, b),
}

/** Herstelcijfers van een dag opslaan; retourneert de nieuwe verzameling. */
export function bewaarHerstel(h: Herstel): Record<string, Herstel> {
  const alles = { ...opslag.herstel(), [h.datum]: h }
  opslag.zetHerstel(alles)
  const wachtrij = opslag.herstelWachtrij()
  if (!wachtrij.includes(h.datum)) opslag.zetHerstelWachtrij([...wachtrij, h.datum])
  return alles
}

/** Schermtijd van een dag opslaan; retourneert de nieuwe verzameling. */
export function bewaarSchermtijd(s: Schermtijd): Record<string, Schermtijd> {
  const alles = { ...opslag.schermtijd(), [s.datum]: s }
  opslag.zetSchermtijd(alles)
  const wachtrij = opslag.schermtijdWachtrij()
  if (!wachtrij.includes(s.datum)) opslag.zetSchermtijdWachtrij([...wachtrij, s.datum])
  return alles
}

/** Taak toevoegen of bijwerken; retourneert de nieuwe lijst (nieuwste eerst). */
export function bewaarTaak(taak: Taak): Taak[] {
  const bestaand = opslag.taken()
  const index = bestaand.findIndex((t) => t.id === taak.id)
  const nieuw = index >= 0
    ? bestaand.map((t) => (t.id === taak.id ? taak : t))
    : [taak, ...bestaand]
  nieuw.sort((a, b) => (a.gemaakt < b.gemaakt ? 1 : -1))
  opslag.zetTaken(nieuw)

  const wachtrij = opslag.takenWachtrij()
  if (!wachtrij.includes(taak.id)) opslag.zetTakenWachtrij([...wachtrij, taak.id])
  return nieuw
}

export function verwijderTaak(id: string): Taak[] {
  const nieuw = opslag.taken().filter((t) => t.id !== id)
  opslag.zetTaken(nieuw)
  opslag.zetTakenWachtrij(opslag.takenWachtrij().filter((w) => w !== id))
  return nieuw
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

/** Geldpost toevoegen of bijwerken; retourneert de nieuwe lijst.
 *  Sorteert op datum (de dag waarop het geld ging), en binnen een dag op het
 *  moment van invoeren — anders springt een nagetypte post van gisteren
 *  bovenaan de lijst. */
export function bewaarPost(post: Post): Post[] {
  const bestaand = opslag.posten()
  const index = bestaand.findIndex((p) => p.id === post.id)
  const nieuw = index >= 0
    ? bestaand.map((p) => (p.id === post.id ? post : p))
    : [post, ...bestaand]
  nieuw.sort((a, b) => (a.datum !== b.datum
    ? (a.datum < b.datum ? 1 : -1)
    : (a.tijdstip < b.tijdstip ? 1 : -1)))
  opslag.zetPosten(nieuw)

  const wachtrij = opslag.postenWachtrij()
  if (!wachtrij.includes(post.id)) opslag.zetPostenWachtrij([...wachtrij, post.id])
  return nieuw
}

export function verwijderPost(id: string): Post[] {
  const nieuw = opslag.posten().filter((p) => p.id !== id)
  opslag.zetPosten(nieuw)
  opslag.zetPostenWachtrij(opslag.postenWachtrij().filter((w) => w !== id))
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
