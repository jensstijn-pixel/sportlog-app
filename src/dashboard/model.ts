import type { Dagbrief, Dataset, Gewicht, Herstel, Schermtijd, Taak, Verrijking } from '../types'
import { CATEGORIE_LABELS, gewichtGemiddelden, nettoSchermtijd } from '../types'
import { gisterenISO, vandaagISO } from '../lib/datum'
import type { Bregje, Rapport } from './typen'

/** Alles wat het dashboard toont, afgeleid uit wat de app al heeft. Geen eigen rekenregels:
 *  waar de Mac al een oordeel gaf (brief, omzet-export, rapport) nemen we dat over. */

export const CUT_START = '2026-09-29'

const gem = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null)
const dagenTussen = (van: string, tot: string) =>
  Math.round((new Date(`${tot}T12:00:00`).getTime() - new Date(`${van}T12:00:00`).getTime()) / 86400000)

export const komma = (n: number, dec = 1) => n.toLocaleString('nl-NL', { minimumFractionDigits: dec, maximumFractionDigits: dec })
export const eur = (n: number, dec = 0) => '€' + n.toLocaleString('nl-NL', { minimumFractionDigits: dec, maximumFractionDigits: dec })
export const uurMin = (m: number) => ({ u: Math.floor(m / 60), m: String(Math.round(m % 60)).padStart(2, '0') })
export const korteDag = (iso: string) => {
  const d = new Date(`${iso}T12:00:00`)
  return `${['zo', 'ma', 'di', 'wo', 'do', 'vr', 'za'][d.getDay()]} ${d.getDate()}-${d.getMonth() + 1}`
}
export const langeDag = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' })

function sectie(brief: Dagbrief | null, id: string): string | null {
  return brief?.secties.find((s) => s.id === id)?.tekst ?? null
}

export interface Oefening { naam: string; sets: string[]; noten: string[] }

/** De training uit de brief (platte tekst) in blokken per oefening. */
export function parseTraining(tekst: string) {
  const regels = tekst.split('\n')
  const titel = regels.find((r) => r.startsWith('TRAINING:'))?.replace('TRAINING:', '').trim() ?? null
  const algemeen: string[] = []
  const oefeningen: Oefening[] = []
  let huidig: Oefening | null = null
  for (const rauw of regels) {
    const r = rauw.trim()
    if (!r || r.startsWith('TRAINING:') || /^[─═-]{4,}$/.test(r)) continue
    const kop = r.match(/^\d+\.\s+(.+)$/)
    if (kop) {
      huidig = { naam: kop[1].replace(/\s*\(.*\)$/, ''), sets: [], noten: [] }
      oefeningen.push(huidig)
      continue
    }
    const set = r.match(/^Set \d+:\s*(.+)$/)
    if (set && huidig) { huidig.sets.push(set[1].replace(/\s{2,}/g, ' · ')); continue }
    if (huidig) huidig.noten.push(r.replace(/^[•⚠→]\s*/, ''))
    else algemeen.push(r.replace(/^[•⚠→]\s*/, ''))
  }
  return { titel, algemeen, oefeningen }
}

export interface Model {
  vandaag: string
  dagLang: string
  dag: { rust: boolean; titel: string; volgende: string | null; dienst: { van: string; tot: string; rol: string } | null; regel: string | null }
  checklist: { id: string; label: string; klaar: boolean; detail: string; naar?: 'herstel' | 'gewicht' | 'schermtijd' }[]
  herstel: {
    vandaag: Herstel | null
    hrvGem: number | null
    rhrGem: number | null
    reeks: Herstel[]
    duiding: string | null
    samenvatting: string | null
  }
  gewicht: { nu: Gewicht | null; week: number | null; vorigeWeek: number | null; start: number | null; reeks: number[] }
  schermtijd: { netto: number | null; bruto: number | null; week: number | null; reeks: number[] }
  training: { tekst: string | null; vorige: { kop: string; tekst: string[] } | null }
  taken: {
    gekozen: { taak: Taak; v?: Verrijking; ligt: number }[]
    overig: { taak: Taak; v?: Verrijking }[]
    cat: (t: Taak) => string
  }
  opWerk: string[]
  voorspel: string | null
  geld: { weken: { datum: string; uit: number; in: number }[]; laatste: { datum: string; uit: number; in: number } | null; gem: number | null; tekst: string | null; uren: string | null }
  bregje: Bregje | null
  rapport: Rapport | null
  rapportVanVandaag: boolean
  brief: Dagbrief | null
}

export function bouwModel(p: {
  brief: Dagbrief | null
  herstel: Record<string, Herstel>
  gewicht: Record<string, Gewicht>
  schermtijd: Record<string, Schermtijd>
  taken: Taak[]
  verrijking: Record<string, Verrijking>
  dataset: Dataset | null
  bregje: Bregje | null
  rapport: Rapport | null
}): Model {
  const vandaag = vandaagISO()
  const gisteren = gisterenISO()
  const brief = p.brief // een oudere brief tonen we ook; de pagina's zeggen van welke dag hij is

  // Dag
  const datumTekst = sectie(brief, 'datum') ?? ''
  const dienstM = datumTekst.match(/Dienst (\d{1,2}:\d\d)\s*[–-]\s*(\d{1,2}:\d\d)\s*\(([^)]+)\)/)
  const volgendeM = datumTekst.match(/Volgende training:\s*([^.]+)\./)
  const vandaagRegel = datumTekst.split('\n').find((r) => r.startsWith('Vandaag:')) ?? null
  const rust = !p.brief?.dagnaam || p.brief.dagnaam === 'rust'
  const dag = {
    rust,
    titel: rust ? 'Rustdag' : p.brief?.dagtitel ?? p.brief?.dagnaam ?? 'Training',
    volgende: volgendeM?.[1] ?? null,
    dienst: dienstM ? { van: dienstM[1], tot: dienstM[2], rol: dienstM[3] } : null,
    regel: vandaagRegel?.replace(/^Vandaag:\s*/, '') ?? null,
  }

  // Herstel
  const herstelReeks = Object.values(p.herstel).filter((h) => h.datum <= vandaag).sort((a, b) => a.datum.localeCompare(b.datum))
  // Zelfde maatstaf als de brief (Daily-app oura.py): gemiddelde van de 14 dagen vóór vandaag.
  const veertienTerug = new Date(`${vandaag}T12:00:00`)
  veertienTerug.setDate(veertienTerug.getDate() - 14)
  const vanaf = veertienTerug.toISOString().slice(0, 10)
  const eerder = herstelReeks.filter((h) => h.datum < vandaag && h.datum >= vanaf)
  const ouraTekst = sectie(brief, 'oura')
  const duiding = ouraTekst?.split('\n').filter((r) => r.trim() && !/^(Slaap|Rusthartslag|Reflectie)\b/.test(r)).map((r) => r.replace(/^→\s*/, '')).join(' ') || null

  // Gewicht
  const gewichtLijst = Object.values(p.gewicht).sort((a, b) => a.datum.localeCompare(b.datum))
  const gGem = gewichtGemiddelden(p.gewicht, vandaag)
  const startMeting = gewichtLijst.find((g) => g.datum >= CUT_START)

  // Schermtijd (gaat over gisteren)
  const stLijst = Object.values(p.schermtijd).sort((a, b) => a.datum.localeCompare(b.datum))
  const netto = stLijst.map((s) => nettoSchermtijd(s)).filter((n): n is number => n != null)
  const stGisteren = p.schermtijd[gisteren]

  // Taken
  const open = p.taken.filter((t) => !t.klaar)
  const gekozen = open
    .filter((t) => p.verrijking[t.id]?.gepland && p.verrijking[t.id].gepland! <= vandaag)
    .map((t) => ({ taak: t, v: p.verrijking[t.id], ligt: dagenTussen(p.verrijking[t.id].gepland!, vandaag) }))
    .sort((a, b) => (a.v?.prioriteit ?? 3) - (b.v?.prioriteit ?? 3) || b.ligt - a.ligt)
  const overig = open.filter((t) => !gekozen.some((g) => g.taak.id === t.id)).map((t) => ({ taak: t, v: p.verrijking[t.id] }))

  // Geld (uit het ABN-afschrift, per week, in centen)
  const weken = (p.dataset?.geld_weken ?? []).map((w) => ({ datum: w.datum, uit: w.uit / 100, in: w.in / 100 }))
  const laatste = weken.at(-1) ?? null
  const gemUit = gem(weken.slice(-9, -1).map((w) => w.uit))

  // Bregje-checklist
  const bg = p.bregje?.gisteren
  const kassaOk = !!bg && bg.datum >= gisteren
  const urenOk = kassaOk && !!bg?.loon
  const maandag = new Date().getDay() === 1

  const checklist: Model['checklist'] = [
    { id: 'oura', label: 'Oura', klaar: !!p.herstel[vandaag], detail: 'vannacht', naar: 'herstel' },
    { id: 'gewicht', label: 'Gewicht', klaar: !!p.gewicht[vandaag], detail: 'vanochtend', naar: 'gewicht' },
    { id: 'schermtijd', label: 'Schermtijd', klaar: !!stGisteren, detail: 'van gisteren', naar: 'schermtijd' },
    { id: 'kassa', label: 'Kassarapport', klaar: kassaOk, detail: bg ? `laatste ${korteDag(bg.datum)}` : 'nog geen' },
    { id: 'uren', label: 'Uren team', klaar: urenOk, detail: 'van gisteren' },
  ]
  if (maandag) checklist.push({ id: 'abn', label: 'ABN-afschrift', klaar: !!sectie(brief, 'financien'), detail: 'maandag' })

  const notities = sectie(brief, 'notities')
  const notRegels = notities?.split('\n').filter((r) => r.trim()) ?? []

  return {
    vandaag,
    dagLang: langeDag(vandaag),
    dag,
    checklist,
    herstel: {
      vandaag: p.herstel[vandaag] ?? null,
      hrvGem: gem(eerder.map((h) => h.hrv).filter((x): x is number => x != null)),
      rhrGem: gem(eerder.map((h) => h.rusthartslag).filter((x): x is number => x != null)),
      reeks: herstelReeks.slice(-14),
      duiding,
      samenvatting: ouraTekst?.split('\n').slice(0, 2).join(' · ') ?? null,
    },
    gewicht: {
      nu: p.gewicht[vandaag] ?? gewichtLijst.at(-1) ?? null,
      week: gGem.deze,
      vorigeWeek: gGem.vorige,
      start: startMeting?.kg ?? null,
      reeks: gewichtLijst.slice(-14).map((g) => g.kg),
    },
    schermtijd: {
      netto: nettoSchermtijd(stGisteren),
      bruto: stGisteren?.totaalMinuten ?? null,
      week: gem(netto.slice(-7)),
      reeks: netto.slice(-8),
    },
    training: {
      tekst: sectie(brief, 'training'),
      vorige: notRegels.length ? { kop: notRegels[0], tekst: notRegels.slice(1).map((r) => r.trim().replace(/^→\s*/, '')) } : null,
    },
    taken: { gekozen, overig, cat: (t) => (p.verrijking[t.id] ? CATEGORIE_LABELS[p.verrijking[t.id].categorie] : 'Nieuw') },
    opWerk: (sectie(brief, 'voeding') ?? '').split('\n').filter((r) => r.startsWith('☐')).map((r) => r.replace(/^☐\s*/, '')),
    voorspel: sectie(brief, 'voorspel')?.split('\n')[0] ?? null,
    geld: { weken, laatste, gem: gemUit, tekst: sectie(brief, 'financien'), uren: sectie(brief, 'uren') },
    bregje: p.bregje,
    rapport: p.rapport,
    rapportVanVandaag: p.rapport?.datum === vandaag,
    brief: p.brief,
  }
}
