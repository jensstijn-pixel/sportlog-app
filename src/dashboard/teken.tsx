import { useId } from 'react'

/** Lijntje met zachte vlakvulling en een stip op het laatste punt. */
export function Spark({ waarden, h = 36, kleur = 'var(--blue)' }: { waarden: number[]; h?: number; kleur?: string }) {
  const id = useId()
  if (waarden.length < 2) return null
  const w = 120
  const lo = Math.min(...waarden)
  const hi = Math.max(...waarden)
  const span = hi - lo || 1
  const pad = 3
  const x = (i: number) => pad + (i * (w - pad * 2)) / (waarden.length - 1)
  const y = (v: number) => pad + (1 - (v - lo) / span) * (h - pad * 2)
  const lijn = waarden.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ')
  const vlak = `${lijn} L${x(waarden.length - 1).toFixed(1)} ${h} L${x(0).toFixed(1)} ${h} Z`
  const lx = x(waarden.length - 1)
  const ly = y(waarden[waarden.length - 1])
  return (
    <svg className="d-spark" viewBox={`0 0 ${w} ${h}`} width="100%" height={h} preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={kleur} stopOpacity=".22" />
          <stop offset="1" stopColor={kleur} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={vlak} fill={`url(#${id})`} stroke="none" />
      <path d={lijn} fill="none" stroke={kleur} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      <circle cx={lx} cy={ly} r="3.2" fill={kleur} stroke="var(--card)" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

/** Staafjes; de laatste krijgt de volle kleur. */
export function Staven({ waarden, h = 40, kleur = 'var(--blue)' }: { waarden: (number | null)[]; h?: number; kleur?: string }) {
  if (!waarden.length) return null
  const hi = Math.max(...waarden.map((v) => v ?? 0)) || 1
  return (
    <div className="d-staven" style={{ height: h }} aria-hidden="true">
      {waarden.map((v, i) => (v == null
        // Dag zonder meting: een stompje, zodat het gat zichtbaar blijft.
        ? <i key={i} style={{ height: 3, background: 'var(--label3)', opacity: 0.6 }} />
        : <i key={i} style={{ height: `${Math.max(6, (v / hi) * 100)}%`, background: kleur, opacity: i === waarden.length - 1 ? 1 : 0.28 }} />))}
    </div>
  )
}

/** Ring zoals in Apple Fitness. */
export function Ring({ waarde, r = 30, dikte = 8, kleur = 'var(--green)', tekst }: { waarde: number; r?: number; dikte?: number; kleur?: string; tekst?: string | number }) {
  const omtrek = 2 * Math.PI * r
  const maat = (r + dikte) * 2
  const af = omtrek * (1 - Math.min(Math.max(waarde, 0), 100) / 100)
  return (
    <svg className="d-ring" viewBox={`0 0 ${maat} ${maat}`} width={maat} height={maat} aria-hidden="true">
      <circle cx={maat / 2} cy={maat / 2} r={r} fill="none" stroke={kleur} strokeOpacity=".18" strokeWidth={dikte} />
      <circle cx={maat / 2} cy={maat / 2} r={r} fill="none" stroke={kleur} strokeWidth={dikte} strokeLinecap="round"
        strokeDasharray={omtrek.toFixed(2)} strokeDashoffset={af.toFixed(2)} transform={`rotate(-90 ${maat / 2} ${maat / 2})`} />
      {tekst != null && <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central" className="d-ring-tekst">{tekst}</text>}
    </svg>
  )
}

/** Voortgangsbalk met optionele doelstreep (beide in %). */
export function Balk({ pct, kleur = 'var(--blue)', doel }: { pct: number; kleur?: string; doel?: number }) {
  return (
    <div className="d-balk" role="presentation">
      <i style={{ width: `${Math.min(Math.max(pct, 0), 100)}%`, background: kleur }} />
      {doel != null && <b style={{ left: `${doel}%` }} />}
    </div>
  )
}

export const VinkIcoon = () => (
  <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true"><path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
)
export const Pijl = () => (
  <svg viewBox="0 0 8 14" width="7" height="12" aria-hidden="true"><path d="M1 1l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
)

/** Rond afvinkknopje, iOS Herinneringen-stijl. */
export function Vinkje({ aan, onClick, label }: { aan: boolean; onClick: () => void; label: string }) {
  return (
    <button type="button" className="d-vinkje" data-aan={aan || undefined} aria-pressed={aan} aria-label={label} onClick={(e) => { e.stopPropagation(); onClick() }}>
      <VinkIcoon />
    </button>
  )
}

// Glyphs in de stijl van SF Symbols
const G = {
  overzicht: <svg viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="3" width="8" height="8" rx="2" /><rect x="13" y="3" width="8" height="8" rx="2" /><rect x="3" y="13" width="8" height="8" rx="2" /><rect x="13" y="13" width="8" height="8" rx="2" /></svg>,
  hart: <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 20.5s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.6a4.3 4.3 0 0 1 7.5 2.7c0 5.6-7.5 10.2-7.5 10.2z" /></svg>,
  halter: <svg viewBox="0 0 24 24" fill="currentColor"><rect x="2" y="8" width="3" height="8" rx="1" /><rect x="5.5" y="6" width="3" height="12" rx="1" /><rect x="15.5" y="6" width="3" height="12" rx="1" /><rect x="19" y="8" width="3" height="8" rx="1" /><rect x="8" y="11" width="8" height="2" /></svg>,
  weegschaal: <svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 3h12a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3zm6 3a5 5 0 0 0-4.6 3h9.2A5 5 0 0 0 12 6z" /></svg>,
  lijst: <svg viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="6" r="2" /><circle cx="5" cy="12" r="2" /><circle cx="5" cy="18" r="2" /><rect x="9" y="5" width="12" height="2" rx="1" /><rect x="9" y="11" width="12" height="2" rx="1" /><rect x="9" y="17" width="12" height="2" rx="1" /></svg>,
  boek: <svg viewBox="0 0 24 24" fill="currentColor"><path d="M5 3h11a3 3 0 0 1 3 3v15H7a2 2 0 0 1-2-2zm2 14v2h10v-2z" /></svg>,
  grafiek: <svg viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="13" width="4" height="8" rx="1" /><rect x="10" y="8" width="4" height="13" rx="1" /><rect x="17" y="3" width="4" height="18" rx="1" /></svg>,
  lijn: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M3 17l5-6 4 3 8-9" /></svg>,
  mail: <svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 5h16a2 2 0 0 1 2 2v.5l-10 6-10-6V7a2 2 0 0 1 2-2zm-2 4.8 10 6 10-6V17a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2z" /></svg>,
  spons: <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.5S5.5 10 5.5 14.5a6.5 6.5 0 0 0 13 0C18.5 10 12 2.5 12 2.5z" /></svg>,
  euro: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M17.5 6.5A6.5 6.5 0 1 0 17.5 17.5M4 10.5h9M4 13.5h9" /></svg>,
  klok: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></svg>,
  winkel: <svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 4h16l1 5a3 3 0 0 1-5 2 3 3 0 0 1-4 0 3 3 0 0 1-4 0 3 3 0 0 1-5-2zm1 9h14v8H5z" /></svg>,
  zon: <svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="4.5" /><g stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8" /></g></svg>,
  tandwiel: <svg viewBox="0 0 24 24" fill="currentColor"><path d="M10.3 2h3.4l.5 2.6 1.9.8 2.2-1.5 2.4 2.4-1.5 2.2.8 1.9 2.6.5v3.4l-2.6.5-.8 1.9 1.5 2.2-2.4 2.4-2.2-1.5-1.9.8-.5 2.6h-3.4l-.5-2.6-1.9-.8-2.2 1.5-2.4-2.4 1.5-2.2-.8-1.9L2 13.7v-3.4l2.6-.5.8-1.9-1.5-2.2 2.4-2.4 2.2 1.5 1.9-.8zM12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7z" /></svg>,
  meer: <svg viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="2.2" /><circle cx="12" cy="12" r="2.2" /><circle cx="19" cy="12" r="2.2" /></svg>,
} as const
export type GlyphNaam = keyof typeof G
export const glyph = (n: GlyphNaam) => G[n]

export function Ic({ g, kleur, maat = 29 }: { g: GlyphNaam; kleur: string; maat?: number }) {
  return (
    <span className="d-ic" style={{ background: kleur, width: maat, height: maat, borderRadius: maat > 24 ? 7 : 5 }}>
      {G[g]}
    </span>
  )
}
