import { useEffect, useMemo, useState } from 'react'
import { CHIP_LABELS, TYPE_LABELS, type Chip, type Herstel, type Notitie, type NotitieType, type OpenVraag, type Signaal, type Weekoverzicht } from '../types'
import { nuISO, weekJaar, weeknummer } from '../lib/datum'
import { nieuwId } from '../lib/opslag'
import { Pijl } from './teken'
import { eur, komma, korteDag, langeDag, uurMin, type Model } from './model'

/** Logboek (sinds 11 nov 2026, ronde per onderdeel): maandkalender met trainingen en notities,
 *  dagweergave (training, notitie + signalen, herstel, geld van die week), alle notities met zoeken
 *  en filters, inzicht per week met "vraag het Claude", en een paneel om te schrijven. */

const TYPES: NotitieType[] = ['krachttraining', 'hardlopen', 'anders']
const CHIPS: Chip[] = ['tijdsnood', 'pijn', 'mindere-dag', 'topdag']
const MAANDEN = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december']
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const hm = (min: number) => { if (min < 60) return `${Math.round(min)} min`; const x = uurMin(min); return `${x.u}u${x.m}` }
const letter = (titel: string | null | undefined) => titel?.match(/\b([A-D])$/)?.[1] ?? '•'
const weekSleutel = (d: Date) => `${weekJaar(d)}-${String(weeknummer(d)).padStart(2, '0')}`

export interface LogboekProps {
  m: Model
  notities: Notitie[]
  signalen: Record<string, Signaal>
  herstel: Record<string, Herstel>
  overzichten: Record<string, Weekoverzicht>
  gesteldeVragen: { vraag: string; op: string }[]
  vraag: OpenVraag | null
  status: string
  startMetNieuw: boolean
  onNieuwGestart: () => void
  onOpslaan: (n: Notitie) => void
  onVerwijder: (id: string) => void
  onVraag: (v: string) => Promise<void>
}

function Energie({ waarde, onKies }: { waarde: number; onKies?: (n: number) => void }) {
  return (
    <span className="d-energie" role={onKies ? 'radiogroup' : undefined} aria-label={`Energie ${waarde} van 5`}>
      {[1, 2, 3, 4, 5].map((n) => onKies
        ? <button key={n} type="button" role="radio" aria-checked={n === waarde} aria-label={`${n}`} data-aan={n <= waarde || undefined} onClick={() => onKies(n)} />
        : <i key={n} data-aan={n <= waarde || undefined} />)}
    </span>
  )
}

function NotitiePaneel({ datum, bestaand, vraag, onOpslaan, onVerwijder, onDicht }: {
  datum: string; bestaand?: Notitie; vraag: OpenVraag | null
  onOpslaan: (n: Notitie) => void; onVerwijder: (id: string) => void; onDicht: () => void
}) {
  const [type, setType] = useState<NotitieType>(bestaand?.type ?? 'krachttraining')
  const [duur, setDuur] = useState(bestaand?.duurMinuten ? String(bestaand.duurMinuten) : '')
  const [energie, setEnergie] = useState(bestaand?.energie ?? 4)
  const [titel, setTitel] = useState(bestaand?.titel ?? '')
  const [tekst, setTekst] = useState(bestaand?.tekst ?? '')
  const [chips, setChips] = useState<Chip[]>(bestaand?.chips ?? [])
  const [zeker, setZeker] = useState(false)
  const kan = tekst.trim().length > 0 || chips.length > 0
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onDicht()
    document.addEventListener('keydown', esc)
    return () => document.removeEventListener('keydown', esc)
  }, [onDicht])
  const opslaan = () => {
    if (!kan) return
    const nu = nuISO()
    const min = duur.trim() ? Number(duur) : NaN
    onOpslaan({
      id: bestaand?.id ?? nieuwId(), datum, tijdstip: bestaand?.tijdstip ?? nu, type,
      duurMinuten: Number.isFinite(min) && min > 0 ? Math.round(min) : null, energie,
      titel: titel.trim() || undefined, tekst: tekst.trim(), chips, bijgewerkt: nu,
    })
    onDicht()
  }
  return (
    <div className="d-sheet" role="dialog" aria-modal="true" aria-labelledby="notitie-titel">
      <div className="d-sheet-waas" onClick={onDicht} />
      <div className="d-sheet-paneel">
        <div className="d-sub" style={{ margin: 0, color: 'var(--blue)', fontWeight: 600, fontSize: 13 }}>{langeDag(datum)}</div>
        <input id="notitie-titel" className="d-titelveld" value={titel} onChange={(e) => setTitel(e.target.value)} placeholder={bestaand ? 'Zonder titel' : 'Nieuwe notitie'} />
        <div className="d-seg" style={{ marginTop: 10 }}>
          {TYPES.map((t) => <button key={t} type="button" aria-selected={type === t} onClick={() => setType(t)}>{TYPE_LABELS[t]}</button>)}
        </div>
        <div className="d-twee-velden">
          <label className="d-veldkaart"><span>Duur</span><span><input id="notitie-duur" inputMode="numeric" value={duur} placeholder="—" onChange={(e) => setDuur(e.target.value.replace(/\D/g, '').slice(0, 3))} /> min</span></label>
          <div className="d-veldkaart"><span>Energie</span><Energie waarde={energie} onKies={setEnergie} /></div>
        </div>
        <div className="d-chipkeuze">
          {CHIPS.map((c) => <button key={c} type="button" aria-pressed={chips.includes(c)} onClick={() => setChips((h) => (h.includes(c) ? h.filter((x) => x !== c) : [...h, c]))}>{CHIP_LABELS[c]}</button>)}
        </div>
        {vraag && !bestaand && (
          <div className="d-vraagkaart"><b>Vraag uit je ochtendbrief</b><p>{vraag.vraag}</p></div>
        )}
        <textarea id="notitie-tekst" className="d-tekstvak" rows={6} value={tekst} autoFocus={!bestaand}
          placeholder="Hoe ging het? Wat viel op? Wat moet ik volgende keer weten?" onChange={(e) => setTekst(e.target.value)} style={{ marginTop: 12 }} />
        <div className="d-knoppen" style={{ justifyContent: 'space-between' }}>
          {bestaand ? (zeker ? (
            <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span className="d-mut" style={{ fontSize: 14 }}>Echt verwijderen?</span>
              <button type="button" className="d-knop" style={{ background: 'var(--red)' }} onClick={() => { onVerwijder(bestaand.id); onDicht() }}>Verwijderen</button>
              <button type="button" className="d-knop zacht" onClick={() => setZeker(false)}>Nee</button>
            </span>
          ) : <button type="button" className="d-knop zacht" style={{ color: 'var(--red)', background: 'color-mix(in srgb, var(--red) 12%, transparent)' }} onClick={() => setZeker(true)}>Verwijderen</button>) : <span />}
          <span style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="d-knop zacht" onClick={onDicht}>Annuleren</button>
            <button type="button" className="d-knop" onClick={opslaan} disabled={!kan}>Opslaan</button>
          </span>
        </div>
      </div>
    </div>
  )
}

function Dag({ p, datum, onSchrijf }: { p: LogboekProps; datum: string; onSchrijf: (n?: Notitie) => void }) {
  const { m } = p
  const notitie = p.notities.find((n) => n.datum === datum)
  const sig = notitie ? p.signalen[notitie.id] : undefined
  const sessie = m.dataset?.sessies.find((s) => s.datum === datum)
  const oefeningen = Object.entries(m.dataset?.oefeningen ?? {}).flatMap(([naam, rijen]) => rijen.filter((r) => r.datum === datum).map((r) => ({ naam, r })))
  const h = p.herstel[datum]
  const ma = new Date(`${datum}T12:00:00`)
  ma.setDate(ma.getDate() - ((ma.getDay() + 6) % 7))
  const week = m.geld.weken.find((w) => w.datum === iso(ma))
  return (
    <div className="d-dag">
      <h2 className="d-dagkop">{langeDag(datum).replace(/^./, (c) => c.toUpperCase())}</h2>

      <h3 className="d-h2" style={{ margin: '14px 16px 7px' }}>Notitie</h3>
      {notitie ? (
        <button type="button" className="d-notitiekaart" onClick={() => onSchrijf(notitie)}>
          <div className="kop"><b>{notitie.titel || TYPE_LABELS[notitie.type]}</b><Energie waarde={notitie.energie} /></div>
          <div className="d-mut" style={{ fontSize: 13, marginTop: 2 }}>{TYPE_LABELS[notitie.type]}{notitie.duurMinuten ? ` · ${notitie.duurMinuten} min` : ''}{notitie.chips.length ? ` · ${notitie.chips.map((c) => CHIP_LABELS[c]).join(', ')}` : ''}</div>
          {notitie.tekst && <p>{notitie.tekst}</p>}
          {sig && (
            <div className="d-signaalblok">
              <b>Wat ik eruit haalde</b>
              <span>{sig.samenvatting}</span>
              {sig.vlaggen.map((v, i) => <span key={i} className="d-badge" style={{ marginTop: 6 }}>{v.soort.replace('_', ' ')}{v.oefening ? `: ${v.oefening}` : ''}</span>)}
            </div>
          )}
          <span className="d-mut" style={{ fontSize: 13, display: 'inline-flex', gap: 4, alignItems: 'center', marginTop: 8 }}>Bewerken <Pijl /></span>
        </button>
      ) : (
        <div className="d-lijst"><button type="button" className="d-rij" onClick={() => onSchrijf()}><span className="tekst" style={{ color: 'var(--blue)' }}>+ Notitie voor deze dag</span></button></div>
      )}

      <h3 className="d-h2" style={{ margin: '22px 16px 7px' }}>Training</h3>
      <div className="d-lijst">
        {sessie ? (
          <>
            <div className="d-rij"><span className="tekst"><b>{sessie.titel ?? 'Training'}</b><small>{sessie.duur_min ? `${sessie.duur_min} min · ` : ''}{sessie.volume.toLocaleString('nl-NL')} kg volume · {sessie.oefeningen} oefeningen</small></span><span className="d-weekletter">{letter(sessie.titel)}</span></div>
            {oefeningen.map(({ naam, r }) => <div key={naam} className="d-rij"><span className="tekst" style={{ fontSize: 14 }}>{naam}</span><span className="waarde">{komma(r.top_gewicht, r.top_gewicht % 1 ? 1 : 0)} × {r.top_reps}</span></div>)}
          </>
        ) : <div className="d-rij"><span className="tekst d-mut">Geen training in Hevy.</span></div>}
      </div>

      <h3 className="d-h2" style={{ margin: '22px 16px 7px' }}>Herstel die ochtend</h3>
      <div className="d-lijst">
        {h ? (
          <div className="d-rij"><span className="tekst">Slaap {h.slaapMinuten != null ? hm(h.slaapMinuten) : '–'} · HRV {h.hrv ?? '–'} · readiness {h.readiness ?? '–'}<small>rusthartslag {h.rusthartslag ?? '–'}{h.tempAfwijking != null ? ` · temp ${h.tempAfwijking > 0 ? '+' : ''}${komma(h.tempAfwijking)}°` : ''}</small></span></div>
        ) : <div className="d-rij"><span className="tekst d-mut">Niet ingevuld.</span></div>}
      </div>

      <h3 className="d-h2" style={{ margin: '22px 16px 7px' }}>Geld</h3>
      <div className="d-lijst">
        <div className="d-rij"><span className="tekst">
          {week ? <>Week van {korteDag(week.datum)}: <b>{eur(week.uit)}</b> uit{m.geld.gem != null ? ` (gem. ${eur(m.geld.gem)})` : ''}</> : 'Deze week nog geen afschrift verwerkt.'}
          <small>Geld komt uit je ABN-afschrift: download elke maandag je bij- en afschrijvingen naar iCloud → Geld. Maandag staat de week in je brief.</small>
        </span></div>
      </div>
    </div>
  )
}

function Inzicht({ p }: { p: LogboekProps }) {
  const [terug, setTerug] = useState(0)
  const [vraag, setVraag] = useState('')
  const [bezig, setBezig] = useState(false)
  const d = new Date()
  d.setHours(12, 0, 0, 0)
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7) - terug * 7)
  const van = iso(d)
  const totD = new Date(d); totD.setDate(d.getDate() + 6)
  const tot = iso(totD)
  const ov = p.overzichten[weekSleutel(d)]
  const sessies = (p.m.dataset?.sessies ?? []).filter((s) => s.datum >= van && s.datum <= tot)
  const notities = p.notities.filter((n) => n.datum >= van && n.datum <= tot)
  const duur = sessies.reduce((a, s) => a + (s.duur_min ?? 0), 0)
  const energie = notities.length ? notities.reduce((a, n) => a + n.energie, 0) / notities.length : null
  const stel = async () => {
    const v = vraag.trim()
    if (!v) return
    setBezig(true)
    try { await p.onVraag(v); setVraag('') } finally { setBezig(false) }
  }
  return (
    <section className="d-lijst d-grafiek" style={{ marginTop: 20 }}>
      <div className="kop">
        <b className="d-num" style={{ fontSize: 20 }}>Week {weeknummer(d)}<small>{korteDag(van)} – {korteDag(tot)}</small></b>
        <span style={{ display: 'flex', gap: 6 }}>
          <button type="button" className="d-rond" aria-label="Vorige week" onClick={() => setTerug(terug + 1)}>‹</button>
          <button type="button" className="d-rond" aria-label="Volgende week" disabled={terug === 0} onClick={() => setTerug(Math.max(0, terug - 1))}>›</button>
        </span>
      </div>
      <div className="d-stats">
        <div><b>{sessies.length}</b><span>trainingen</span></div>
        <div><b>{duur ? hm(duur) : '–'}</b><span>totaal</span></div>
        <div><b>{energie != null ? komma(energie, 1) : '–'}</b><span>energie gem.</span></div>
      </div>
      {ov?.samenvatting ? <p style={{ margin: '12px 0 0', fontSize: 15, lineHeight: 1.5 }}>{ov.samenvatting}</p> : <p className="d-mut" style={{ margin: '12px 0 0', fontSize: 14 }}>Nog geen weekoverzicht van de Mac voor deze week.</p>}
      {!!ov?.antwoorden?.length && (
        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {ov.antwoorden.map((a, i) => <div key={i} className="d-vraagkaart"><b>{a.vraag}</b><p>{a.antwoord}</p></div>)}
        </div>
      )}
      {terug === 0 && (
        <>
          {p.gesteldeVragen.filter((g) => !ov?.antwoorden?.some((a) => a.vraag === g.vraag)).slice(0, 3).map((g) => (
            <p key={g.op} className="d-mut" style={{ fontSize: 13, margin: '10px 0 0' }}>Gesteld: “{g.vraag}”, het antwoord komt morgenochtend.</p>
          ))}
          <div className="d-rij" style={{ padding: 0, marginTop: 10, background: 'var(--card2)', borderRadius: 10 }}>
            <input className="d-invoer" id="vraag-claude" style={{ padding: '0 12px' }} value={vraag} placeholder="Vraag het Claude, over je training of herstel…" onChange={(e) => setVraag(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && stel()} />
            {vraag.trim() && <button type="button" className="d-knop" style={{ height: 32, marginRight: 8 }} disabled={bezig} onClick={stel}>Stel</button>}
          </div>
        </>
      )}
    </section>
  )
}

export function LogboekPagina(p: LogboekProps) {
  const { m } = p
  const [weergave, setWeergave] = useState<'kalender' | 'lijst'>('kalender')
  const [gekozen, setGekozen] = useState(m.vandaag)
  const [maand, setMaand] = useState(() => m.vandaag.slice(0, 7))
  const [paneel, setPaneel] = useState<{ datum: string; bestaand?: Notitie } | null>(null)
  const [zoek, setZoek] = useState('')
  const [filter, setFilter] = useState<'alle' | 'pijn' | 'mindere-dag' | 'laag' | 'hoog'>('alle')

  useEffect(() => {
    if (p.startMetNieuw) { setPaneel({ datum: m.vandaag, bestaand: p.notities.find((n) => n.datum === m.vandaag) }); p.onNieuwGestart() }
  }, [p.startMetNieuw]) // eslint-disable-line react-hooks/exhaustive-deps

  const sessiePer = useMemo(() => new Map((m.dataset?.sessies ?? []).map((s) => [s.datum, s])), [m.dataset])
  const notitiePer = useMemo(() => new Map(p.notities.map((n) => [n.datum, n])), [p.notities])

  // Maandraster, maandag eerst
  const [jaar, mnd] = maand.split('-').map(Number)
  const eerste = new Date(jaar, mnd - 1, 1, 12)
  const start = new Date(eerste)
  start.setDate(1 - ((eerste.getDay() + 6) % 7))
  const cellen = Array.from({ length: 42 }, (_, i) => { const d = new Date(start); d.setDate(start.getDate() + i); return d })
  const zichtbaar = cellen[35].getMonth() === mnd - 1 ? cellen : cellen.slice(0, 35)
  const schuif = (n: number) => { const d = new Date(jaar, mnd - 1 + n, 1, 12); setMaand(iso(d).slice(0, 7)) }
  const kies = (datum: string) => { setGekozen(datum); setWeergave('kalender'); setMaand(datum.slice(0, 7)) }

  const lijst = p.notities
    .filter((n) => {
      const sig = p.signalen[n.id]
      if (filter === 'pijn' && !(n.chips.includes('pijn') || sig?.vlaggen.some((v) => v.soort === 'pijn'))) return false
      if (filter === 'mindere-dag' && !(n.chips.includes('mindere-dag') || sig?.vlaggen.some((v) => /mindere|fatigue/.test(v.soort)))) return false
      if (filter === 'laag' && n.energie > 2) return false
      if (filter === 'hoog' && n.energie < 4) return false
      const z = zoek.trim().toLowerCase()
      return !z || `${n.titel ?? ''} ${n.tekst}`.toLowerCase().includes(z)
    })
    .sort((a, b) => b.datum.localeCompare(a.datum))

  return (
    <div className="d-pagina">
      <div className="d-paginakop">
        <div><h1 className="d-h1">Logboek</h1><p className="d-sub" style={{ marginBottom: 0 }}>{p.notities.length} notities · {p.status}</p></div>
        <button type="button" className="d-knop" onClick={() => setPaneel({ datum: gekozen, bestaand: notitiePer.get(gekozen) })}>+ Notitie</button>
      </div>

      <Inzicht p={p} />

      <div className="d-seg" style={{ margin: '24px 0 12px', maxWidth: 360 }}>
        <button type="button" aria-selected={weergave === 'kalender'} onClick={() => setWeergave('kalender')}>Kalender</button>
        <button type="button" aria-selected={weergave === 'lijst'} onClick={() => setWeergave('lijst')}>Alle notities</button>
      </div>

      {weergave === 'kalender' ? (
        <div className="d-logboek">
          <section className="d-lijst d-grafiek d-kalender">
            <div className="kop">
              <b style={{ fontSize: 20 }}>{MAANDEN[mnd - 1].replace(/^./, (c) => c.toUpperCase())} {jaar}</b>
              <span style={{ display: 'flex', gap: 6 }}>
                <button type="button" className="d-rond" aria-label="Vorige maand" onClick={() => schuif(-1)}>‹</button>
                <button type="button" className="d-rond" aria-label="Volgende maand" onClick={() => schuif(1)}>›</button>
              </span>
            </div>
            <div className="d-maand">
              {['ma', 'di', 'wo', 'do', 'vr', 'za', 'zo'].map((x) => <small key={x}>{x}</small>)}
              {zichtbaar.map((d) => {
                const ds = iso(d)
                const s = sessiePer.get(ds)
                const n = notitiePer.get(ds)
                return (
                  <button key={ds} type="button" className="d-maanddag" data-buiten={d.getMonth() !== mnd - 1 || undefined}
                    data-vandaag={ds === m.vandaag || undefined} aria-pressed={ds === gekozen} onClick={() => setGekozen(ds)}
                    aria-label={`${langeDag(ds)}${s ? `, ${s.titel}` : ''}${n ? ', notitie' : ''}`}>
                    <span className="nr">{d.getDate()}</span>
                    <span className="tekens">
                      {s && <span className="d-weekletter klein">{letter(s.titel)}</span>}
                      {n && <span className="punt" />}
                    </span>
                  </button>
                )
              })}
            </div>
            <div className="d-legenda"><span><span className="d-weekletter klein">A</span> training</span><span><span className="punt" /> notitie</span></div>
          </section>
          <Dag p={p} datum={gekozen} onSchrijf={(n) => setPaneel({ datum: gekozen, bestaand: n })} />
        </div>
      ) : (
        <>
          <div className="d-lijst"><div className="d-rij"><input className="d-invoer" id="zoek-notities" placeholder="Zoek in je notities" value={zoek} onChange={(e) => setZoek(e.target.value)} /></div></div>
          <div className="d-chipkeuze" style={{ margin: '10px 0' }}>
            {([['alle', 'Alle'], ['pijn', 'Pijn'], ['mindere-dag', 'Mindere dag'], ['laag', 'Energie 1–2'], ['hoog', 'Energie 4–5']] as const).map(([k, l]) => (
              <button key={k} type="button" aria-pressed={filter === k} onClick={() => setFilter(k)}>{l}</button>
            ))}
          </div>
          <div className="d-lijst">
            {lijst.length ? lijst.map((n) => (
              <button key={n.id} type="button" className="d-rij" onClick={() => kies(n.datum)}>
                <span className="tekst"><b>{n.titel || n.tekst.split('\n')[0].slice(0, 60) || TYPE_LABELS[n.type]}</b>
                  <small>{korteDag(n.datum)}{n.duurMinuten ? ` · ${n.duurMinuten} min` : ''}{n.chips.length ? ` · ${n.chips.map((c) => CHIP_LABELS[c]).join(', ')}` : ''}{sessiePer.get(n.datum) ? ` · ${sessiePer.get(n.datum)!.titel}` : ''}</small></span>
                <Energie waarde={n.energie} />
                <span className="chev"><Pijl /></span>
              </button>
            )) : <div className="d-rij"><span className="tekst d-mut">Geen notities gevonden.</span></div>}
          </div>
        </>
      )}

      {paneel && <NotitiePaneel datum={paneel.datum} bestaand={paneel.bestaand} vraag={p.vraag} onOpslaan={p.onOpslaan} onVerwijder={p.onVerwijder} onDicht={() => setPaneel(null)} />}
    </div>
  )
}
