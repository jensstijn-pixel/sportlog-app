/** Bedragen staan overal in hele centen; hier staan de twee vertalingen
 *  tussen dat getal en wat je op het scherm ziet. */

/** "12,50" of "12.5" of "12" naar centen. Geeft null bij onzin, zodat een
 *  knop uit blijft in plaats van dat er een rare post ontstaat. */
export function naarCent(tekst: string): number | null {
  const schoon = tekst.replace(/\s|€/g, '').replace(',', '.')
  if (!schoon || !/^\d*\.?\d*$/.test(schoon)) return null
  const n = Number(schoon)
  if (!Number.isFinite(n) || n <= 0) return null
  return Math.round(n * 100)
}

/** Centen naar "1.234,56". Zonder euroteken: dat zet de opmaak eromheen. */
export function euro(cent: number): string {
  const heel = Math.floor(Math.abs(cent) / 100)
  const rest = String(Math.abs(cent) % 100).padStart(2, '0')
  return `${heel.toLocaleString('nl-NL')},${rest}`
}
