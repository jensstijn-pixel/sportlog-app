import { useLayoutEffect, useRef, useState } from 'react'
import { nettoSchermtijd } from '../types'
import { Pijl, Spark } from './teken'
import { MAX_SCHERMTIJD, eur, komma, korteDag, perWeek, uurMin } from './model'
import type { Pagina } from './Schil'
import type { PaginaProps } from './Paginas'

/** Trends (sinds 11 nov 2026, vervangt Tracking): het grote plaatje over 3 of 6 maanden in kleine
 *  grafieken per week, en de samenhang tussen herstel en prestatie met een spreidingsdiagram. */

const hm = (min: number) => { const x = uurMin(min); return `${x.u}u${x.m}` }

interface Reeks {
  naam: string
  kleur: string
  naar: Pagina
  punten: { maandag: string; waarde: number | null }[]
  fmt: (n: number) => string
  /** Welke kant is goed: 'omhoog', 'omlaag' of null (neutraal). */
  goed: 'omhoog' | 'omlaag' | null
  uitleg?: string
  /** Vanaf hoeveel % verandering het geen "stabiel" meer is (default 3). */
  drempel?: number
  /** Totalen per week: de lopende week is nog niet af en telt niet mee. */
  som?: boolean
}

const afgeronde = (r: Reeks) => (r.som ? r.punten.slice(0, -1) : r.punten)

function richting(r: Reeks) {
  const xs = afgeronde(r).map((p) => p.waarde).filter((v): v is number => v != null)
  if (xs.length < 4) return null
  const k = Math.min(4, Math.floor(xs.length / 2))
  const begin = xs.slice(0, k).reduce((a, b) => a + b, 0) / k
  const eind = xs.slice(-k).reduce((a, b) => a + b, 0) / k
  const pct = begin ? ((eind - begin) / Math.abs(begin)) * 100 : 0
  const woord = Math.abs(pct) < (r.drempel ?? 3) ? 'stabiel' : pct > 0 ? 'stijgt' : 'daalt'
  const kleur = woord === 'stabiel' || !r.goed ? '' : (pct > 0) === (r.goed === 'omhoog') ? 'd-goed' : 'd-let'
  return { woord, pct: Math.abs(pct) < 10 ? Math.round(pct * 10) / 10 : Math.round(pct), kleur, eind }
}

function Tegel({ r, onNaar }: { r: Reeks; onNaar: (p: Pagina) => void }) {
  const t = richting(r)
  const laatste = [...afgeronde(r)].reverse().find((p) => p.waarde != null)
  return (
    <button type="button" className="d-trend" onClick={() => onNaar(r.naar)}>
      <div className="kop"><span style={{ color: r.kleur }}>{r.naam}</span><Pijl /></div>
      <div className="d-groot" style={{ fontSize: 26, marginTop: 6 }}>{laatste ? r.fmt(laatste.waarde!) : '–'}</div>
      <div className={`d-onder ${t?.kleur ?? ''}`}>{t ? `${t.woord}${t.woord !== 'stabiel' ? ` (${t.pct > 0 ? '+' : ''}${komma(t.pct, t.pct % 1 ? 1 : 0)}%)` : ''}` : 'te weinig weken'}{r.uitleg ? ` · ${r.uitleg}` : ''}</div>
      <Spark waarden={afgeronde(r).map((p) => p.waarde).filter((v): v is number => v != null)} h={40} kleur={r.kleur} />
    </button>
  )
}

const VAR = {
  readiness: { label: 'Readiness', fmt: (n: number) => String(Math.round(n)) },
  hrv: { label: 'HRV', fmt: (n: number) => `${Math.round(n)} ms` },
  slaap_min: { label: 'Slaap', fmt: hm },
} as const
type Var = keyof typeof VAR

function sterkte(r: number | null | undefined) {
  if (r == null) return null
  const a = Math.abs(r)
  return a >= 0.5 ? 'sterk' : a >= 0.3 ? 'redelijk' : a >= 0.1 ? 'zwak' : 'geen'
}

function Spreiding({ paren, x, grens }: { paren: { [k: string]: number | null }[]; x: Var; grens?: number }) {
  const doos = useRef<HTMLDivElement>(null)
  const [w, setW] = useState(600)
  const [actief, setActief] = useState<number | null>(null)
  useLayoutEffect(() => {
    const el = doos.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setW(Math.max(240, e.contentRect.width)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const pts = paren.map((p, i) => ({ i, x: p[x], y: p.volume, datum: p.datum as unknown as string })).filter((p): p is { i: number; x: number; y: number; datum: string } => p.x != null && p.y != null)
  if (pts.length < 3) return <div ref={doos} className="d-tg-leeg">Te weinig dagen met beide cijfers.</div>
  const h = 230, l = 44, r = 12, b = 30, t = 10
  const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y)
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = 0, y1 = Math.max(...ys) * 1.08
  const sx = (v: number) => l + ((v - x0) / (x1 - x0 || 1)) * (w - l - r)
  const sy = (v: number) => t + (1 - (v - y0) / (y1 - y0 || 1)) * (h - t - b)
  // Trendlijn (kleinste kwadraten)
  const mx = xs.reduce((a, c) => a + c, 0) / xs.length, my = ys.reduce((a, c) => a + c, 0) / ys.length
  const helling = pts.reduce((a, p) => a + (p.x - mx) * (p.y - my), 0) / (pts.reduce((a, p) => a + (p.x - mx) ** 2, 0) || 1)
  const yAt = (v: number) => my + helling * (v - mx)
  const a = actief != null ? pts.find((p) => p.i === actief) : null
  const fmt = VAR[x].fmt
  return (
    <div ref={doos} className="d-tg" style={{ marginTop: 6 }}>
      <svg width={w} height={h} role="img" aria-label={`${VAR[x].label} tegen trainingsvolume`}>
        {[0, 0.5, 1].map((f) => { const v = y0 + f * (y1 - y0); return (
          <g key={f}><line x1={l} x2={w - r} y1={sy(v)} y2={sy(v)} stroke="var(--sep)" />
            <text x={l - 6} y={sy(v)} textAnchor="end" dominantBaseline="central" className="d-tg-as">{Math.round(v / 1000)}k</text></g>) })}
        {grens != null && x === 'readiness' && <line x1={sx(grens)} x2={sx(grens)} y1={t} y2={h - b} stroke="var(--label3)" strokeDasharray="3 4" />}
        <line x1={sx(x0)} x2={sx(x1)} y1={sy(yAt(x0))} y2={sy(yAt(x1))} stroke="var(--green)" strokeOpacity=".5" strokeWidth="3" strokeLinecap="round" />
        {pts.map((p) => (
          <circle key={p.i} cx={sx(p.x)} cy={sy(p.y)} r={actief === p.i ? 6 : 4.5} fill="var(--green)" fillOpacity={actief == null || actief === p.i ? 0.85 : 0.35}
            stroke="var(--card)" strokeWidth="1.5" onPointerEnter={() => setActief(p.i)} onPointerDown={() => setActief(p.i)} onPointerLeave={() => setActief(null)} />
        ))}
        <text x={sx(x0)} y={h - 8} className="d-tg-as">{fmt(x0)}</text>
        <text x={sx(x1)} y={h - 8} textAnchor="end" className="d-tg-as">{fmt(x1)}</text>
        <text x={(l + w - r) / 2} y={h - 8} textAnchor="middle" className="d-tg-as">{VAR[x].label} →</text>
      </svg>
      {a && <div className="d-tg-tip" style={{ left: Math.min(Math.max(sx(a.x), 80), w - 80), top: Math.max(0, sy(a.y) - 34) }}><b>{korteDag(a.datum)}</b> · {fmt(a.x)} · {a.y.toLocaleString('nl-NL')} kg</div>}
    </div>
  )
}

export function TrendsPagina({ m, onNaar }: PaginaProps) {
  const [weken, setWeken] = useState<13 | 26>(13)
  const [x, setX] = useState<Var>('readiness')
  const herstel = m.herstel.alle
  const sessies = m.dataset?.sessies ?? []
  const reeksen: Reeks[] = [
    { naam: 'HRV', kleur: 'var(--orange)', naar: 'herstel', goed: 'omhoog', fmt: (n) => `${Math.round(n)} ms`, punten: perWeek(herstel.map((h) => ({ datum: h.datum, waarde: h.hrv })), weken) },
    { naam: 'Readiness', kleur: 'var(--green)', naar: 'herstel', goed: 'omhoog', fmt: (n) => String(Math.round(n)), punten: perWeek(herstel.map((h) => ({ datum: h.datum, waarde: h.readiness })), weken) },
    { naam: 'Slaap', kleur: 'var(--indigo)', naar: 'herstel', goed: 'omhoog', fmt: hm, punten: perWeek(herstel.map((h) => ({ datum: h.datum, waarde: h.slaapMinuten })), weken) },
    { naam: 'Rusthartslag', kleur: 'var(--red)', naar: 'herstel', goed: 'omlaag', fmt: (n) => `${Math.round(n)} bpm`, punten: perWeek(herstel.map((h) => ({ datum: h.datum, waarde: h.rusthartslag })), weken) },
    { naam: 'Gewicht', kleur: 'var(--purple)', naar: 'gewicht', goed: 'omlaag', fmt: (n) => `${komma(n)} kg`, uitleg: 'cut', drempel: 0.5, punten: perWeek(Object.values(m.gewicht.alles).map((g) => ({ datum: g.datum, waarde: g.kg })), weken) },
    { naam: 'Schermtijd', kleur: 'var(--blue)', naar: 'schermtijd', goed: 'omlaag', fmt: hm, uitleg: `max ${hm(MAX_SCHERMTIJD)}`, punten: perWeek(Object.values(m.schermtijd.alles).map((s) => ({ datum: s.datum, waarde: nettoSchermtijd(s) })), weken) },
    { naam: 'Trainingsvolume', kleur: 'var(--green)', naar: 'training', goed: 'omhoog', fmt: (n) => `${Math.round(n / 1000)}k kg`, uitleg: 'vorige week', som: true, punten: perWeek(sessies.map((s) => ({ datum: s.datum, waarde: s.volume })), weken, true) },
    { naam: 'Trainingen', kleur: 'var(--teal)', naar: 'training', goed: null, fmt: (n) => `${Math.round(n)}×`, uitleg: 'vorige week', som: true, punten: perWeek(sessies.map((s) => ({ datum: s.datum, waarde: 1 })), weken, true) },
    { naam: 'Energie', kleur: 'var(--yellow)', naar: 'logboek', goed: 'omhoog', fmt: (n) => `${komma(n, 1)} / 5`, uitleg: 'uit je notities', punten: perWeek(m.energie.map((e) => ({ datum: e.datum, waarde: e.energie })), weken) },
    { naam: 'Uitgaven', kleur: 'var(--green)', naar: 'geld', goed: 'omlaag', fmt: (n) => eur(n), uitleg: 'per week', punten: perWeek(m.geld.weken.map((g) => ({ datum: g.datum, waarde: g.uit })), weken) },
  ]
  const s = m.dataset?.samenhang
  const paren = ((s as unknown as { paren?: { [k: string]: number | null }[] })?.paren) ?? []
  const c = s?.correlaties ?? {}
  const zin = (sleutel: string, wat: string, n?: number) => {
    const r = c[sleutel]
    const st = sterkte(r)
    if (r == null || !st) return null
    return {
      st, r,
      tekst: st === 'geen' ? `${wat}: geen verband te zien.` : `${wat}: ${st} verband${r > 0 ? '' : ' (omgekeerd)'}.`,
      n,
    }
  }
  const metEnergie = paren.filter((p) => p.energie != null).length
  const verbanden = [
    zin('readiness_volume', 'Readiness en volume'),
    zin('hrv_volume', 'HRV en volume'),
    zin('slaap_volume', 'Slaap en volume'),
    zin('readiness_energie', 'Readiness en energie in je notitie', metEnergie),
  ].filter((v): v is NonNullable<typeof v> => !!v)

  return (
    <div className="d-pagina">
      <div className="d-paginakop">
        <div><h1 className="d-h1">Trends</h1><p className="d-sub" style={{ marginBottom: 0 }}>Het grote plaatje, per week. Tik op een grafiek voor de details.</p></div>
        <div className="d-seg" style={{ minWidth: 220 }}>
          <button type="button" aria-selected={weken === 13} onClick={() => setWeken(13)}>3 maanden</button>
          <button type="button" aria-selected={weken === 26} onClick={() => setWeken(26)}>6 maanden</button>
        </div>
      </div>

      <div className="d-trends">{reeksen.map((r) => <Tegel key={r.naam} r={r} onNaar={onNaar} />)}</div>
      <p className="d-voetnoot">Stijgt of daalt: de laatste 4 weken tegen de eerste 4 van de periode. Groen = de goede kant op, oranje = de verkeerde. Totalen (volume, trainingen) tellen t/m vorige week; deze week is nog niet af.</p>

      <h2 className="d-h2" style={{ marginTop: 30 }}>Herstel en prestatie</h2>
      {s ? (
        <>
          <section className="d-duiding">
            <div className="d-duiding-kop" style={{ color: 'var(--green)' }}>Wat de cijfers zeggen</div>
            <p>{s.betrouwbaar && s.conclusie ? s.conclusie : `Nog te weinig om iets te zeggen: ${s.n} dagen met zowel herstelcijfers als een training, vanaf ${s.min_nodig} volgt een vergelijking.`}</p>
          </section>
          <div className="d-lijst d-grafiek" style={{ marginTop: 16 }}>
            <div className="d-seg" role="tablist" aria-label="Wat tegen volume">
              {(Object.keys(VAR) as Var[]).map((k) => <button key={k} type="button" role="tab" aria-selected={x === k} onClick={() => setX(k)}>{VAR[k].label}</button>)}
            </div>
            <Spreiding paren={paren} x={x} grens={s.vergelijking?.laag_grens} />
            <div className="d-grafiek-voet"><span>Elke stip is een trainingsdag: {VAR[x].label.toLowerCase()} die ochtend tegen het volume van je training. De groene lijn is de trend.</span></div>
          </div>
          <h2 className="d-h2">Verbanden</h2>
          <div className="d-lijst">
            {verbanden.map((v) => (
              <div key={v.tekst} className="d-rij">
                <span className="tekst">{v.tekst}<small>{v.n != null ? `op ${v.n} dagen met een notitie${v.n < 12 ? ', nog weinig' : ''}` : `op ${s.n} trainingsdagen`}</small></span>
                <span className={`waarde ${v.st === 'sterk' || v.st === 'redelijk' ? 'd-goed' : ''}`}>{komma(v.r, 2)}</span>
              </div>
            ))}
          </div>
          <p className="d-voetnoot">Een verband is geen oorzaak: op betere dagen train je misschien ook om andere redenen harder. Vanaf {s.min_nodig} dagen noemt de Mac het betrouwbaar; nu {s.n}.</p>
        </>
      ) : <div className="d-lijst"><div className="d-rij"><span className="tekst d-mut">Nog geen samenhang berekend door de Mac.</span></div></div>}
    </div>
  )
}
