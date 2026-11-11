import { useLayoutEffect, useRef, useState } from 'react'
import { korteDag } from './model'

export interface Punt { datum: string; waarde: number | null }

/** Grafiek op echte dagen: een dag zonder meting is een gat, geen verschoven punt.
 *  Gestippeld = je gemiddelde (zelfde maatstaf als de brief), dikke zachte lijn = 7-daags gemiddelde.
 *  Aanraken of muis eroverheen toont de waarde van die dag. */
export function TijdGrafiek({
  punten, kleur, gem, formatteer = (n) => String(Math.round(n)), soort = 'lijn', h = 170, doel, kleurVoor, tipExtra,
}: {
  punten: Punt[]
  kleur: string
  gem?: number | null
  formatteer?: (n: number) => string
  soort?: 'lijn' | 'staaf'
  h?: number
  /** Een doel- of maximumlijn, bijvoorbeeld "max" bij schermtijd. */
  doel?: { waarde: number; label: string } | null
  /** Kleur per staaf (bijv. oranje boven je max). */
  kleurVoor?: (v: number) => string
  /** Extra tekst bij aanraken, bijv. de weegschaal. */
  tipExtra?: (datum: string) => string | undefined
}) {
  const doos = useRef<HTMLDivElement>(null)
  const [w, setW] = useState(600)
  const [actief, setActief] = useState<number | null>(null)
  useLayoutEffect(() => {
    const el = doos.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setW(Math.max(200, e.contentRect.width)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const waarden = punten.map((p) => p.waarde).filter((v): v is number => v != null)
  if (!waarden.length) return <div ref={doos} className="d-tg-leeg">Nog geen metingen in deze periode.</div>

  const links = 6, rechts = 44, boven = 22, onder = 22
  const lo0 = Math.min(...waarden, gem ?? Infinity, doel?.waarde ?? Infinity)
  const hi0 = Math.max(...waarden, gem ?? -Infinity, doel?.waarde ?? -Infinity)
  const marge = (hi0 - lo0) * 0.12 || 1
  const lo = soort === 'staaf' ? 0 : lo0 - marge
  const hi = hi0 + marge
  const n = punten.length
  const stap = (w - links - rechts) / Math.max(1, n - 1)
  const x = (i: number) => (soort === 'staaf' ? links + (i + 0.5) * ((w - links - rechts) / n) : links + i * stap)
  const y = (v: number) => boven + (1 - (v - lo) / (hi - lo)) * (h - boven - onder)

  // Lijn in stukken: een gat breekt de lijn.
  const stukken: string[] = []
  let huidig = ''
  punten.forEach((p, i) => {
    if (p.waarde == null) { if (huidig) stukken.push(huidig); huidig = ''; return }
    huidig += `${huidig ? 'L' : 'M'}${x(i).toFixed(1)} ${y(p.waarde).toFixed(1)} `
  })
  if (huidig) stukken.push(huidig)

  // 7-daags gemiddelde over de dagen mét meting.
  const trend = punten.map((_, i) => {
    const venster = punten.slice(Math.max(0, i - 6), i + 1).map((p) => p.waarde).filter((v): v is number => v != null)
    return venster.length >= 3 ? venster.reduce((a, b) => a + b, 0) / venster.length : null
  })
  const trendPad = trend.reduce((acc, v, i) => (v == null ? acc : acc + `${acc ? 'L' : 'M'}${x(i).toFixed(1)} ${y(v).toFixed(1)} `), '')

  const staafB = Math.max(2, ((w - links - rechts) / n) * 0.62)
  const kies = (clientX: number) => {
    const r = doos.current!.getBoundingClientRect()
    const rel = clientX - r.left
    let beste = 0
    punten.forEach((_, i) => { if (Math.abs(x(i) - rel) < Math.abs(x(beste) - rel)) beste = i })
    setActief(beste)
  }
  const a = actief != null ? punten[actief] : null
  const labels = [0, Math.floor((n - 1) / 2), n - 1]

  return (
    <div ref={doos} className="d-tg" onPointerMove={(e) => kies(e.clientX)} onPointerDown={(e) => kies(e.clientX)} onPointerLeave={() => setActief(null)}>
      <svg width={w} height={h} role="img" aria-label="Grafiek per dag">
        {[lo0, hi0].map((v, i) => (
          <g key={i}>
            <line x1={links} x2={w - rechts} y1={y(v)} y2={y(v)} stroke="var(--sep)" />
            <text x={w - rechts + 6} y={y(v)} dominantBaseline="central" className="d-tg-as">{formatteer(v)}</text>
          </g>
        ))}
        {gem != null && (
          <g>
            <line x1={links} x2={w - rechts} y1={y(gem)} y2={y(gem)} stroke="var(--label2)" strokeDasharray="3 4" />
            <text x={w - rechts + 6} y={y(gem)} dominantBaseline="central" className="d-tg-as">gem.</text>
          </g>
        )}
        {doel && (
          <g>
            <line x1={links} x2={w - rechts} y1={y(doel.waarde)} y2={y(doel.waarde)} stroke="var(--red)" strokeOpacity=".7" strokeDasharray="6 4" />
            <text x={w - rechts + 6} y={y(doel.waarde)} dominantBaseline="central" className="d-tg-as" style={{ fill: 'var(--red)' }}>{doel.label}</text>
          </g>
        )}
        {soort === 'staaf'
          ? punten.map((p, i) => (p.waarde == null
            ? <rect key={i} x={x(i) - staafB / 2} y={h - onder - 3} width={staafB} height={3} rx={1.5} fill="var(--fill)" />
            : <rect key={i} x={x(i) - staafB / 2} y={y(p.waarde)} width={staafB} height={Math.max(2, y(lo) - y(p.waarde))} rx={Math.min(4, staafB / 2)}
                fill={kleurVoor ? kleurVoor(p.waarde) : kleur} opacity={actief == null || actief === i ? 1 : 0.35} />))
          : (
            <>
              {trendPad && <path d={trendPad} fill="none" stroke={kleur} strokeOpacity=".22" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />}
              {stukken.map((d, i) => <path key={i} d={d} fill="none" stroke={kleur} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />)}
              {n <= 31 && punten.map((p, i) => p.waarde != null && (
                <circle key={i} cx={x(i)} cy={y(p.waarde)} r={i === n - 1 ? 4 : 2.6} fill={kleur} stroke="var(--card)" strokeWidth="1.5" />
              ))}
              {n > 31 && punten[n - 1].waarde != null && <circle cx={x(n - 1)} cy={y(punten[n - 1].waarde!)} r={4} fill={kleur} stroke="var(--card)" strokeWidth="1.5" />}
            </>
          )}
        {punten.map((p, i) => p.waarde == null && soort === 'lijn' && n <= 31 && (
          <circle key={`g${i}`} cx={x(i)} cy={h - onder - 2} r={2} fill="var(--label3)" />
        ))}
        {labels.map((i) => (
          <text key={i} x={x(i)} y={h - 6} textAnchor={i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'} className="d-tg-as">{korteDag(punten[i].datum)}</text>
        ))}
        {a && actief != null && (
          <g>
            <line x1={x(actief)} x2={x(actief)} y1={boven - 6} y2={h - onder} stroke="var(--label3)" />
          </g>
        )}
      </svg>
      {a && actief != null && (
        <div className="d-tg-tip" style={{ left: Math.min(Math.max(x(actief), 60), w - 60) }}>
          <b>{a.waarde == null ? 'niet ingevuld' : formatteer(a.waarde)}</b> {korteDag(a.datum)}
          {a.waarde != null && tipExtra?.(a.datum) ? ` · ${tipExtra(a.datum)}` : ''}
        </div>
      )}
    </div>
  )
}
