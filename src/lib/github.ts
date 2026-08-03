import type { Notitie, OpenVraag, Signaal, Weekoverzicht } from '../types'
import { nuISO, weekJaar, weeknummer } from './datum'
import { opslag, type Instellingen } from './opslag'

/** Dunne laag over de GitHub Contents API. De privé data-repo is puur transport
 *  tussen telefoon en Mac: de app schrijft notities, de Mac schrijft signalen,
 *  weekoverzichten en vragen terug. */

const API = 'https://api.github.com'

export class GitHubFout extends Error {
  constructor(message: string, readonly status?: number) {
    super(message)
    this.name = 'GitHubFout'
  }
}

function koppen(inst: Instellingen): HeadersInit {
  return {
    Authorization: `Bearer ${inst.token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  }
}

function naarBase64(tekst: string): string {
  const bytes = new TextEncoder().encode(tekst)
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin)
}

function vanBase64(b64: string): string {
  const bin = atob(b64.replace(/\s/g, ''))
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)))
}

function padUrl(inst: Instellingen, pad: string): string {
  return `${API}/repos/${inst.owner}/${inst.repo}/contents/${pad}`
}

async function fout(res: Response): Promise<GitHubFout> {
  let detail = res.statusText
  try {
    const body = (await res.json()) as { message?: string }
    if (body.message) detail = body.message
  } catch {
    // Geen JSON-body; statusText volstaat.
  }
  if (res.status === 401) return new GitHubFout('Token ongeldig of verlopen.', 401)
  if (res.status === 403) return new GitHubFout('Token heeft geen schrijfrechten op deze repo.', 403)
  if (res.status === 404) return new GitHubFout('Repo of pad niet gevonden.', 404)
  return new GitHubFout(detail, res.status)
}

/** Leest een bestand. null als het (nog) niet bestaat — dat is geen fout. */
export async function leesBestand(inst: Instellingen, pad: string): Promise<string | null> {
  const res = await fetch(`${padUrl(inst, pad)}?ref=main`, { headers: koppen(inst) })
  if (res.status === 404) return null
  if (!res.ok) throw await fout(res)
  const body = (await res.json()) as { content?: string; encoding?: string }
  if (!body.content) return null
  return vanBase64(body.content)
}

export async function leesJson<T>(inst: Instellingen, pad: string): Promise<T | null> {
  const rauw = await leesBestand(inst, pad)
  if (!rauw) return null
  try {
    return JSON.parse(rauw) as T
  } catch {
    return null
  }
}

/** Schrijft (of overschrijft) een bestand. Haalt eerst de sha op als het al bestaat. */
export async function schrijfBestand(
  inst: Instellingen,
  pad: string,
  inhoud: string,
  bericht: string,
): Promise<void> {
  let sha: string | undefined
  const bestaand = await fetch(`${padUrl(inst, pad)}?ref=main`, { headers: koppen(inst) })
  if (bestaand.ok) {
    const body = (await bestaand.json()) as { sha?: string }
    sha = body.sha
  } else if (bestaand.status !== 404) {
    throw await fout(bestaand)
  }

  const res = await fetch(padUrl(inst, pad), {
    method: 'PUT',
    headers: { ...koppen(inst), 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: bericht, content: naarBase64(inhoud), sha, branch: 'main' }),
  })
  if (!res.ok) throw await fout(res)
}

/** Controleert token + repo zonder iets te schrijven. */
export async function controleer(inst: Instellingen): Promise<{ ok: true } | { ok: false; fout: string }> {
  if (!inst.token) return { ok: false, fout: 'Nog geen token ingevuld.' }
  try {
    const res = await fetch(`${API}/repos/${inst.owner}/${inst.repo}`, { headers: koppen(inst) })
    if (!res.ok) throw await fout(res)
    const body = (await res.json()) as { permissions?: { push?: boolean } }
    if (body.permissions && !body.permissions.push) {
      return { ok: false, fout: 'Token kan lezen maar niet schrijven. Zet Contents op "Read and write".' }
    }
    return { ok: true }
  } catch (e) {
    return { ok: false, fout: e instanceof Error ? e.message : 'Onbekende fout.' }
  }
}

export interface SyncResultaat {
  verzonden: number
  wachtend: number
  fout?: string
}

/** Werkt de wachtrij af: elke notitie wordt een eigen bestand, dus telefoon en
 *  Mac kunnen tegelijk schrijven zonder merge-conflicten. */
export async function syncWachtrij(): Promise<SyncResultaat> {
  const inst = opslag.instellingen()
  const wachtrij = opslag.wachtrij()
  if (!inst.token) return { verzonden: 0, wachtend: wachtrij.length, fout: 'Nog niet gekoppeld.' }
  if (!wachtrij.length) return { verzonden: 0, wachtend: 0 }
  if (!navigator.onLine) return { verzonden: 0, wachtend: wachtrij.length, fout: 'Offline.' }

  const notities = opslag.notities()
  let verzonden = 0
  let restfout: string | undefined

  for (const id of [...wachtrij]) {
    const notitie = notities.find((n) => n.id === id)
    if (!notitie) {
      // Lokaal verwijderd voordat hij verstuurd was: gewoon uit de wachtrij halen.
      opslag.zetWachtrij(opslag.wachtrij().filter((w) => w !== id))
      continue
    }
    try {
      await schrijfBestand(
        inst,
        `notities/${id}.json`,
        JSON.stringify(notitie, null, 2) + '\n',
        `Notitie ${notitie.datum}`,
      )
      opslag.zetWachtrij(opslag.wachtrij().filter((w) => w !== id))
      verzonden++
    } catch (e) {
      restfout = e instanceof Error ? e.message : 'Onbekende fout.'
      break // Netwerk of rechten: verder proberen heeft nu geen zin.
    }
  }
  return { verzonden, wachtend: opslag.wachtrij().length, fout: restfout }
}

/** Haalt op wat de Mac heeft teruggeschreven: signalen, weekoverzicht, open vraag. */
export async function haalTerug(): Promise<void> {
  const inst = opslag.instellingen()
  if (!inst.token || !navigator.onLine) return

  const nu = new Date()
  const sleutel = `${weekJaar(nu)}-${String(weeknummer(nu)).padStart(2, '0')}`

  const [signalen, overzicht, vraag] = await Promise.all([
    leesJson<Record<string, Signaal>>(inst, 'signalen/laatste.json').catch(() => null),
    leesJson<Weekoverzicht>(inst, `overzicht/week-${sleutel}.json`).catch(() => null),
    leesJson<OpenVraag>(inst, 'vraag/open.json').catch(() => null),
  ])

  if (signalen) opslag.zetSignalen(signalen)
  if (overzicht) opslag.zetOverzicht({ ...opslag.overzicht(), [sleutel]: overzicht })
  opslag.zetVraag(vraag)
}

/** Stelt een vraag die de Mac bij de volgende ochtendrun beantwoordt. */
export async function stelVraag(vraag: string): Promise<void> {
  const inst = opslag.instellingen()
  if (!inst.token) throw new GitHubFout('Nog niet gekoppeld.')
  const op = nuISO()
  await schrijfBestand(
    inst,
    `vraag/aan-claude/${op.replace(/[:+]/g, '-')}.json`,
    JSON.stringify({ vraag, gesteld_op: op }, null, 2) + '\n',
    'Vraag vanuit de app',
  )
  opslag.zetGesteldeVragen([{ vraag, op }, ...opslag.gesteldeVragen()].slice(0, 20))
}

/** Vangnet: alle notities uit de repo terughalen (nieuwe telefoon, opslag gewist). */
export async function herstelVanRepo(): Promise<number> {
  const inst = opslag.instellingen()
  if (!inst.token) throw new GitHubFout('Nog niet gekoppeld.')

  const res = await fetch(`${padUrl(inst, 'notities')}?ref=main`, { headers: koppen(inst) })
  if (!res.ok) throw await fout(res)
  const bestanden = (await res.json()) as { name: string; path: string }[]

  const lokaal = opslag.notities()
  const bekend = new Set(lokaal.map((n) => n.id))
  const opgehaald: Notitie[] = []

  for (const b of bestanden) {
    if (!b.name.endsWith('.json')) continue
    if (bekend.has(b.name.replace(/\.json$/, ''))) continue
    const notitie = await leesJson<Notitie>(inst, b.path)
    if (notitie?.id) opgehaald.push(notitie)
  }

  if (opgehaald.length) {
    const samen = [...lokaal, ...opgehaald].sort((a, b) => (a.tijdstip < b.tijdstip ? 1 : -1))
    opslag.zetNotities(samen)
  }
  return opgehaald.length
}
