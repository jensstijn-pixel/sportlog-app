import { useEffect, useState, type ReactNode } from 'react'
import type { Gewicht, Herstel, Schermtijd, Weegschaal } from '../types'
import { gewichtGemiddelden, SCHERMTIJD_APPS, WEEGSCHALEN } from '../types'
import { isoDatum, nuISO, parseISO, vandaagISO } from '../lib/datum'
import { korteDag, MAX_SCHERMTIJD } from './model'
import type { Invul } from './Overzicht'

/** Invullen als paneel (sinds 11 nov 2026): Oura, gewicht en schermtijd, los of alles in één keer.
 *  Op de telefoon schuift het van onderen op, op de laptop opent het in het midden.
 *
 *  - De datum is te kiezen, zodat een gemiste dag alsnog kan. Bij "ochtend" geldt de gekozen dag
 *    voor Oura en gewicht; schermtijd gaat altijd over de dag ervoor (Apple toont gisteren afgerond).
 *  - Elk veld vergelijkt meteen met je gemiddelde, met dezelfde drempels als de brief (oura.py).
 *  - Alleen onderdelen die je aanraakt worden bewaard; leegmaken wist niets. */

export type InvulSoort = Invul

const dagErvoor = (iso: string, n = 1) => { const d = parseISO(iso); d.setDate(d.getDate() - n); return isoDatum(d) }
const getal = (t: string) => { const s = t.replace(',', '.').trim(); if (!s) return null; const n = Number(s); return Number.isFinite(n) ? n : null }
const tekst = (n: number | null | undefined) => (n == null ? '' : String(n).replace('.', ','))
const uM = (min: number | null | undefined) => (min == null ? { u: '', m: '' } : { u: String(Math.floor(min / 60)), m: String(min % 60).padStart(2, '0') })
const samen = (u: string, m: string) => (!u.trim() && !m.trim() ? null : (getal(u) ?? 0) * 60 + (getal(m) ?? 0))
const hm = (min: number) => `${Math.floor(min / 60)}u ${String(Math.round(min % 60)).padStart(2, '0')}`
const kg1 = (n: number) => n.toFixed(1).replace('.', ',')

/** Gemiddelde over de 14 dagen vóór `dag` (zoals de brief). */
function gem14(alles: Record<string, Herstel>, dag: string, w: (h: Herstel) => number | null) {
  const xs: number[] = []
  for (let i = 1; i <= 14; i++) { const v = alles[dagErvoor(dag, i)]; const x = v ? w(v) : null; if (x != null) xs.push(x) }
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null
}

type Vergelijk = { tekst: string; kleur?: 'goed' | 'let' | 'slecht' } | null

// ── Bouwstenen ──
function Rij({ label, sub, vergelijk, children }: { label: string; sub?: string; vergelijk?: Vergelijk; children: ReactNode }) {
  return (
    <label className="d-rij d-irij">
      <span className="tekst">
        {label}
        {vergelijk ? <small className={vergelijk.kleur ? `d-${vergelijk.kleur}` : ''}>{vergelijk.tekst}</small> : sub ? <small>{sub}</small> : null}
      </span>
      <span className="d-invoer">{children}</span>
    </label>
  )
}
function Getal({ waarde, zet, eenheid, breed, plek = '–', stap }: { waarde: string; zet: (v: string) => void; eenheid?: string; breed?: boolean; plek?: string; stap?: boolean }) {
  return (
    <>
      <input className={`d-getal ${breed ? 'breed' : ''}`} type="text" inputMode={stap ? 'decimal' : 'numeric'} value={waarde} placeholder={plek}
        onChange={(e) => zet(e.target.value)} onFocus={(e) => e.target.select()} />
      {/* Bij enkele velden een vaste breedte, zodat de vakjes onder elkaar uitlijnen. */}
      {breed ? <span className="d-eenheid vast">{eenheid}</span> : eenheid && <span className="d-eenheid">{eenheid}</span>}
    </>
  )
}

// ── Toestand per onderdeel ──
const herstelStart = (h?: Herstel) => ({ ...uM(h?.slaapMinuten), readiness: tekst(h?.readiness), slaapScore: tekst(h?.slaapScore), hrv: tekst(h?.hrv), rhr: tekst(h?.rusthartslag), temp: tekst(h?.tempAfwijking) })
const gewichtStart = (g: Gewicht | undefined, standaard: Weegschaal) => ({ kg: g ? kg1(g.kg) : '', schaal: g?.weegschaal ?? standaard })
const schermStart = (s?: Schermtijd) => {
  const t = uM(s?.totaalMinuten), f = uM(s?.aftrek?.[SCHERMTIJD_APPS[0]])
  return { u: t.u, m: t.m, fu: f.u, fm: f.m }
}

export function InvulPaneel({
  soort, herstel, gewicht, schermtijd, onBewaar, onDicht,
}: {
  soort: InvulSoort
  herstel: Record<string, Herstel>
  gewicht: Record<string, Gewicht>
  schermtijd: Record<string, Schermtijd>
  onBewaar: (w: { herstel?: Herstel; gewicht?: Gewicht; schermtijd?: Schermtijd }) => void
  onDicht: () => void
}) {
  const vandaag = vandaagISO()
  const gisteren = dagErvoor(vandaag)
  const alleenScherm = soort === 'schermtijd'
  // `dag` = de ochtend; bij alleen schermtijd = de dag waar de schermtijd over gaat.
  const [dag, setDag] = useState(alleenScherm ? gisteren : vandaag)
  const [andere, setAndere] = useState(false)
  const schermDag = alleenScherm ? dag : dagErvoor(dag)
  const toon = { herstel: soort === 'ochtend' || soort === 'herstel', gewicht: soort === 'ochtend' || soort === 'gewicht', scherm: soort === 'ochtend' || alleenScherm }

  const laatsteSchaal = Object.values(gewicht).filter((g) => g.weegschaal).sort((a, b) => b.datum.localeCompare(a.datum))[0]?.weegschaal ?? 'withings-pa'
  const [h, setH] = useState(() => herstelStart(herstel[dag]))
  const [g, setG] = useState(() => gewichtStart(gewicht[dag], laatsteSchaal))
  const [s, setS] = useState(() => schermStart(schermtijd[schermDag]))
  const [geraakt, setGeraakt] = useState({ herstel: false, gewicht: false, scherm: false })

  function kiesDag(d: string) {
    if (!d || d > vandaag) return
    setDag(d)
    setH(herstelStart(herstel[d]))
    setG(gewichtStart(gewicht[d], laatsteSchaal))
    setS(schermStart(schermtijd[alleenScherm ? d : dagErvoor(d)]))
    setGeraakt({ herstel: false, gewicht: false, scherm: false })
  }
  const zetH = (k: keyof typeof h) => (v: string) => { setH((x) => ({ ...x, [k]: v })); setGeraakt((x) => ({ ...x, herstel: true })) }
  const zetS = (k: keyof typeof s) => (v: string) => { setS((x) => ({ ...x, [k]: v })); setGeraakt((x) => ({ ...x, scherm: true })) }

  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onDicht()
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [onDicht])

  // ── Herstel: waardes en vergelijkingen ──
  const slaap = samen(h.u, h.m)
  const hv = { readiness: getal(h.readiness), slaapScore: getal(h.slaapScore), hrv: getal(h.hrv), rhr: getal(h.rhr), temp: getal(h.temp) }
  const gHrv = gem14(herstel, dag, (x) => x.hrv), gRhr = gem14(herstel, dag, (x) => x.rusthartslag)
  const gSlaap = gem14(herstel, dag, (x) => x.slaapMinuten), gScore = gem14(herstel, dag, (x) => x.slaapScore), gReady = gem14(herstel, dag, (x) => x.readiness)
  const v = {
    slaap: slaap != null && gSlaap != null ? (() => { const d = Math.round(slaap - gSlaap); return { tekst: `${d >= 0 ? '+' : '−'}${Math.abs(d)} min t.o.v. je gemiddelde (${hm(gSlaap)})`, kleur: d < -60 ? 'let' as const : undefined } })() : null,
    readiness: hv.readiness != null ? { tekst: `${hv.readiness < 70 ? 'onder 70' : hv.readiness >= 85 ? 'sterk' : 'oké'}${gReady != null ? ` · gem. ${Math.round(gReady)}` : ''}`, kleur: hv.readiness < 70 ? 'let' as const : hv.readiness >= 85 ? 'goed' as const : undefined } : null,
    slaapScore: hv.slaapScore != null && gScore != null ? { tekst: `${hv.slaapScore - gScore >= 0 ? '+' : '−'}${Math.abs(Math.round(hv.slaapScore - gScore))} t.o.v. gem. ${Math.round(gScore)}` } : null,
    hrv: hv.hrv != null && gHrv ? (() => { const p = Math.round(((hv.hrv - gHrv) / gHrv) * 100); return { tekst: `${p >= 0 ? '+' : '−'}${Math.abs(p)}% t.o.v. gem. ${Math.round(gHrv)} ms`, kleur: p < -10 ? 'let' as const : p > 10 ? 'goed' as const : undefined } })() : null,
    rhr: hv.rhr != null && gRhr != null ? (() => { const d = Math.round(hv.rhr - gRhr); return { tekst: `${d >= 0 ? '+' : '−'}${Math.abs(d)} t.o.v. gem. ${Math.round(gRhr)} bpm`, kleur: d > 5 ? 'let' as const : d < -3 ? 'goed' as const : undefined } })() : null,
    temp: hv.temp != null ? { tekst: hv.temp > 0.5 ? 'verhoogd: let op ziek worden' : 'normaal', kleur: hv.temp > 0.5 ? 'slecht' as const : undefined } : null,
  }
  const herstelIets = slaap != null || Object.values(hv).some((x) => x != null)

  // ── Gewicht ──
  const n = getal(g.kg)
  const kg = n != null && n >= 40 && n <= 200 ? Math.round(n * 10) / 10 : null
  const tikfout = !!g.kg.trim() && kg == null
  const metDeze = kg == null ? gewicht : { ...gewicht, [dag]: { datum: dag, kg, bijgewerkt: '' } }
  const { deze, vorige } = gewichtGemiddelden(metDeze, dag)
  const vorigeWeging = Object.values(gewicht).filter((x) => x.datum < dag).sort((a, b) => b.datum.localeCompare(a.datum))[0]
  const gewichtVergelijk: Vergelijk = tikfout ? { tekst: 'Dat lijkt een tikfout.', kleur: 'slecht' }
    : kg != null && vorigeWeging ? { tekst: `${kg - vorigeWeging.kg >= 0 ? '+' : '−'}${kg1(Math.abs(kg - vorigeWeging.kg))} t.o.v. ${korteDag(vorigeWeging.datum)}` } : null

  // ── Schermtijd ──
  const totaal = samen(s.u, s.m), flits = samen(s.fu, s.fm)
  const netto = totaal == null ? null : Math.max(0, totaal - (flits ?? 0))
  const over = netto != null ? Math.round(netto - MAX_SCHERMTIJD) : null

  const bewaarHerstel = toon.herstel && geraakt.herstel && herstelIets
  const bewaarGewicht = toon.gewicht && geraakt.gewicht && kg != null
  const bewaarScherm = toon.scherm && geraakt.scherm && (totaal != null || flits != null)
  const kan = !tikfout && (bewaarHerstel || bewaarGewicht || bewaarScherm)

  function bewaar() {
    if (!kan) return
    const nu = nuISO()
    onBewaar({
      herstel: bewaarHerstel ? { datum: dag, slaapMinuten: slaap, slaapScore: hv.slaapScore, readiness: hv.readiness, hrv: hv.hrv, rusthartslag: hv.rhr, tempAfwijking: hv.temp, bijgewerkt: nu } : undefined,
      gewicht: bewaarGewicht ? { datum: dag, kg: kg!, weegschaal: g.schaal, bijgewerkt: nu } : undefined,
      schermtijd: bewaarScherm ? { datum: schermDag, totaalMinuten: totaal, aftrek: { [SCHERMTIJD_APPS[0]]: flits }, bijgewerkt: nu } : undefined,
    })
  }

  const titel = soort === 'ochtend' ? 'Ochtend invullen' : soort === 'herstel' ? 'Vannacht' : soort === 'gewicht' ? 'Gewicht' : 'Schermtijd'
  const opties = alleenScherm ? [[gisteren, 'Gisteren'], [dagErvoor(vandaag, 2), 'Eergisteren']] : [[vandaag, 'Vandaag'], [gisteren, 'Gisteren']]
  const isOptie = !andere && opties.some(([d]) => d === dag)
  const dagNaam = (d: string) => (d === vandaag ? 'vandaag' : d === gisteren ? 'gisteren' : korteDag(d))

  return (
    <div className="d-sheet" role="dialog" aria-modal="true" aria-labelledby="invul-titel">
      <div className="d-sheet-waas" onClick={onDicht} />
      <div className="d-sheet-paneel d-invul">
        <div className="d-invul-kop">
          <button type="button" onClick={onDicht}>Annuleren</button>
          <h2 id="invul-titel">{titel}</h2>
          <button type="button" className="vet" disabled={!kan} onClick={bewaar}>Bewaar</button>
        </div>

        <div className="d-seg" style={{ margin: '4px 0 6px' }}>
          {opties.map(([d, l]) => <button key={d} type="button" aria-selected={isOptie && dag === d} onClick={() => { setAndere(false); kiesDag(d) }}>{l}</button>)}
          <button type="button" aria-selected={!isOptie} onClick={() => setAndere(true)}>Andere dag</button>
        </div>
        {!isOptie && (
          <label className="d-rij d-irij d-lijst" style={{ marginTop: 8 }}>
            <span className="tekst">Datum</span>
            <input className="d-datum" type="date" value={dag} max={vandaag} onChange={(e) => kiesDag(e.target.value)} />
          </label>
        )}

        {toon.herstel && (
          <>
            <h3 className="d-h2">Oura · nacht naar {dagNaam(dag)}</h3>
            <div className="d-lijst">
              <Rij label="Slaap" sub="Slaap → Total sleep" vergelijk={v.slaap}>
                <Getal waarde={h.u} zet={zetH('u')} eenheid="u" plek="7" /><Getal waarde={h.m} zet={zetH('m')} eenheid="m" plek="30" />
              </Rij>
              <Rij label="Readiness" sub="startscherm" vergelijk={v.readiness}><Getal waarde={h.readiness} zet={zetH('readiness')} breed /></Rij>
              <Rij label="Slaapscore" sub="startscherm" vergelijk={v.slaapScore}><Getal waarde={h.slaapScore} zet={zetH('slaapScore')} breed /></Rij>
              <Rij label="HRV" sub="Slaap → Average HRV" vergelijk={v.hrv}><Getal waarde={h.hrv} zet={zetH('hrv')} eenheid="ms" breed /></Rij>
              <Rij label="Rusthartslag" sub="Slaap → laagste" vergelijk={v.rhr}><Getal waarde={h.rhr} zet={zetH('rhr')} eenheid="bpm" breed /></Rij>
              <Rij label="Temperatuur" sub="afwijking, mag negatief" vergelijk={v.temp}><Getal waarde={h.temp} zet={zetH('temp')} eenheid="°C" breed stap /></Rij>
            </div>
            <p className="d-voetnoot">Alles mag leeg blijven; wat je invult telt mee.</p>
          </>
        )}

        {toon.gewicht && (
          <>
            <h3 className="d-h2">Gewicht · {dagNaam(dag)}</h3>
            <div className="d-lijst">
              <Rij label="Gewicht" sub="na het toilet, vóór eten en drinken" vergelijk={gewichtVergelijk}>
                <Getal waarde={g.kg} zet={(x) => { setG((o) => ({ ...o, kg: x })); setGeraakt((o) => ({ ...o, gewicht: true })) }} eenheid="kg" breed stap plek="00,0" />
              </Rij>
              <div className="d-rij d-irij">
                <span className="tekst">Weegschaal</span>
                <div className="d-seg klein" style={{ width: 120 }}>
                  {WEEGSCHALEN.map((w) => <button key={w.waarde} type="button" aria-selected={g.schaal === w.waarde} onClick={() => { setG((o) => ({ ...o, schaal: w.waarde })); setGeraakt((o) => ({ ...o, gewicht: true })) }}>{w.label}</button>)}
                </div>
              </div>
              <div className="d-rij d-irij">
                <span className="tekst">7-daags gemiddelde<small>{deze == null ? 'vanaf 3 wegingen in een week' : vorige != null ? `${deze - vorige <= 0 ? '−' : '+'}${kg1(Math.abs(deze - vorige))} kg t.o.v. de week ervoor` : 'met deze weging erbij'}</small></span>
                <span className="waarde" style={{ fontWeight: 600, color: 'var(--label)' }}>{deze == null ? '–' : `${kg1(deze)} kg`}</span>
              </div>
            </div>
          </>
        )}

        {toon.scherm && (
          <>
            <h3 className="d-h2">Schermtijd · {dagNaam(schermDag)}</h3>
            <div className="d-lijst">
              <Rij label="Totaal volgens Apple" sub="Instellingen → Schermtijd">
                <Getal waarde={s.u} zet={zetS('u')} eenheid="u" plek="4" /><Getal waarde={s.m} zet={zetS('m')} eenheid="m" plek="00" />
              </Rij>
              <Rij label="Flitsmeister" sub="tijd in de auto, telt niet mee">
                <Getal waarde={s.fu} zet={zetS('fu')} eenheid="u" plek="0" /><Getal waarde={s.fm} zet={zetS('fm')} eenheid="m" plek="00" />
              </Rij>
              <div className="d-rij d-irij">
                <span className="tekst">Netto
                  {over != null && <small className={over > 0 ? 'd-let' : 'd-goed'}>{over > 0 ? `${over} min boven je max van 3,5 u` : `${-over} min onder je max van 3,5 u`}</small>}
                </span>
                <span className="waarde" style={{ fontWeight: 600, color: 'var(--label)' }}>{netto == null ? '–' : hm(netto)}</span>
              </div>
            </div>
          </>
        )}

        <button type="button" className="d-knop d-invul-bewaar" disabled={!kan} onClick={bewaar}>Bewaar</button>
      </div>
    </div>
  )
}
