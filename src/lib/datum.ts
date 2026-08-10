const DAG_KORT = ['MA', 'DI', 'WO', 'DO', 'VR', 'ZA', 'ZO']
const MAAND_KORT = ['JAN', 'FEB', 'MRT', 'APR', 'MEI', 'JUN', 'JUL', 'AUG', 'SEP', 'OKT', 'NOV', 'DEC']
const MAAND_VOL = [
  'JANUARI', 'FEBRUARI', 'MAART', 'APRIL', 'MEI', 'JUNI',
  'JULI', 'AUGUSTUS', 'SEPTEMBER', 'OKTOBER', 'NOVEMBER', 'DECEMBER',
]

export const WEEKDAGEN = DAG_KORT

const pad = (n: number) => String(n).padStart(2, '0')

/** Maandag = 0, zondag = 6 (de kalender begint op maandag). */
export function weekdagIndex(d: Date): number {
  return (d.getDay() + 6) % 7
}

export function isoDatum(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function vandaagISO(): string {
  return isoDatum(new Date())
}

export function gisterenISO(): string {
  const d = new Date()
  return isoDatum(new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1))
}

/** Parset YYYY-MM-DD als lokale datum (new Date('2026-08-03') is UTC). */
export function parseISO(iso: string): Date {
  const [j, m, d] = iso.split('-').map(Number)
  return new Date(j, m - 1, d)
}

/** ISO 8601 met lokale tijdzone-offset, bv. 2026-08-03T18:42:11+02:00 */
export function nuISO(): string {
  const d = new Date()
  const off = -d.getTimezoneOffset()
  const teken = off >= 0 ? '+' : '-'
  const abs = Math.abs(off)
  return (
    `${isoDatum(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}` +
    `${teken}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`
  )
}

/** "MA 3 AUG 2026" */
export function eyebrowDatum(iso: string): string {
  const d = parseISO(iso)
  return `${DAG_KORT[weekdagIndex(d)]} ${d.getDate()} ${MAAND_KORT[d.getMonth()]} ${d.getFullYear()}`
}

/** "MA 3 AUG" */
export function korteDatum(iso: string): string {
  const d = parseISO(iso)
  return `${DAG_KORT[weekdagIndex(d)]} ${d.getDate()} ${MAAND_KORT[d.getMonth()]}`
}

/** "AUGUSTUS 2026" */
export function maandTitel(jaar: number, maand: number): string {
  return `${MAAND_VOL[maand]} ${jaar}`
}

export interface Dagcel {
  iso: string
  dag: number
  inMaand: boolean
}

/** Maandgrid van 6 weken, altijd beginnend op maandag. */
export function maandGrid(jaar: number, maand: number): Dagcel[] {
  const eerste = new Date(jaar, maand, 1)
  const start = new Date(jaar, maand, 1 - weekdagIndex(eerste))
  const cellen: Dagcel[] = []
  for (let i = 0; i < 42; i++) {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i)
    cellen.push({ iso: isoDatum(d), dag: d.getDate(), inMaand: d.getMonth() === maand })
  }
  // Laatste rij weglaten als die volledig buiten de maand valt.
  return cellen.slice(0, cellen.slice(35).every((c) => !c.inMaand) ? 35 : 42)
}

/** ISO-8601 weeknummer. */
export function weeknummer(d: Date): number {
  const t = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  t.setDate(t.getDate() + 3 - weekdagIndex(t))
  const eersteDonderdag = new Date(t.getFullYear(), 0, 4)
  eersteDonderdag.setDate(eersteDonderdag.getDate() + 3 - weekdagIndex(eersteDonderdag))
  return 1 + Math.round((t.getTime() - eersteDonderdag.getTime()) / (7 * 864e5))
}

/** Het jaar waar de ISO-week bij hoort (kan afwijken rond de jaarwisseling). */
export function weekJaar(d: Date): number {
  const t = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  t.setDate(t.getDate() + 3 - weekdagIndex(t))
  return t.getFullYear()
}

/** De 7 dagen (ma–zo) van de week waar deze datum in valt. */
export function weekDagen(d: Date): string[] {
  const ma = new Date(d.getFullYear(), d.getMonth(), d.getDate() - weekdagIndex(d))
  return Array.from({ length: 7 }, (_, i) =>
    isoDatum(new Date(ma.getFullYear(), ma.getMonth(), ma.getDate() + i)),
  )
}

/** "27 JUL – 2 AUG" */
export function weekBereikTekst(dagen: string[]): string {
  const a = parseISO(dagen[0])
  const b = parseISO(dagen[6])
  return `${a.getDate()} ${MAAND_KORT[a.getMonth()]} – ${b.getDate()} ${MAAND_KORT[b.getMonth()]}`
}

/** 220 → "3u 40" */
export function duurTekst(minuten: number): string {
  const u = Math.floor(minuten / 60)
  const m = minuten % 60
  if (!u) return `${m} min`
  return m ? `${u}u ${pad(m)}` : `${u}u`
}
