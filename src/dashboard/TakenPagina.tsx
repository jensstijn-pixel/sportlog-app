import { useEffect, useState } from 'react'
import type { Taak } from '../types'
import { nuISO } from '../lib/datum'
import { Pijl, Vinkje } from './teken'
import { korteDag, subtakenVan, type Model } from './model'
import type { PaginaProps } from './Paginas'

/** Taken (sinds 11 nov 2026, ronde per onderdeel): subtaken, afgerond deze week, ordening op
 *  prioriteit, zelf plannen/bewerken/verwijderen, etiketten afvinken. Eigen keuzes staan in het
 *  taakbestand zelf en winnen van de ochtendverrijking (ook in de brief). */

/** Etiketten "op werk checken": afvinken alleen op dit toestel, per dag (ze komen uit de brief). */
export function useOpWerkKlaar(datum: string) {
  const sleutel = `daily.opwerk.${datum}`
  const [klaar, setKlaar] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(sleutel) ?? '[]') as string[] } catch { return [] }
  })
  const wissel = (x: string) => {
    const nieuw = klaar.includes(x) ? klaar.filter((y) => y !== x) : [...klaar, x]
    setKlaar(nieuw)
    try { localStorage.setItem(sleutel, JSON.stringify(nieuw)) } catch { /* alleen deze sessie */ }
  }
  return { klaar, wissel }
}

const PRIO_NAAM: Record<1 | 2 | 3, string> = { 1: 'Eerst', 2: 'Daarna', 3: 'Mag wachten' }

function TaakRij({ m, taak, sub, onBewaar, onOpen }: { m: Model; taak: Taak; sub?: string; onBewaar: (t: Taak) => void; onOpen: () => void }) {
  const [uit, setUit] = useState(false)
  const st = subtakenVan(taak)
  const af = st?.punten.filter((p) => p.klaar).length ?? 0
  const vink = () => { const nu = nuISO(); onBewaar({ ...taak, klaar: !taak.klaar, klaarOp: !taak.klaar ? nu : undefined, bijgewerkt: nu }) }
  const vinkPunt = (i: number) => {
    if (!st) return
    const punten = st.punten.map((p, j) => (j === i ? { ...p, klaar: !p.klaar } : p))
    onBewaar({ ...taak, subtaken: punten, bijgewerkt: nuISO() })
  }
  return (
    <div className="d-taak" data-klaar={taak.klaar || undefined}>
      <div className="d-rij">
        <Vinkje aan={taak.klaar} onClick={vink} label={`Afvinken: ${taak.tekst}`} />
        <button type="button" className="tekst d-taak-tekst" onClick={onOpen}>
          <span className="d-vink-tekst">{st ? st.titel : taak.tekst}</span>
          <small>
            {st && <b className={af === st.punten.length ? 'd-goed' : ''}>{af} van {st.punten.length} punten · </b>}
            {sub ?? m.taken.cat(taak)}
          </small>
        </button>
        {st && (
          <button type="button" className="d-uitklap" aria-expanded={uit} aria-label={uit ? 'Punten verbergen' : 'Punten tonen'} onClick={() => setUit(!uit)}>
            <Pijl />
          </button>
        )}
      </div>
      {st && uit && (
        <ul className="d-punten">
          {st.punten.map((p, i) => (
            <li key={i} data-klaar={p.klaar || undefined}>
              <Vinkje aan={p.klaar} onClick={() => vinkPunt(i)} label={`Punt ${i + 1} afvinken`} />
              <span className="d-vink-tekst">{p.tekst}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function Bewerk({ m, taak, onBewaar, onDicht }: { m: Model; taak: Taak; onBewaar: (t: Taak) => void; onDicht: () => void }) {
  const [tekst, setTekst] = useState(taak.tekst)
  const plan0 = taak.later ? 'later' : taak.gepland === m.vandaag ? 'vandaag' : 'auto'
  const [plan, setPlan] = useState<'auto' | 'vandaag' | 'later'>(plan0)
  const [prio, setPrio] = useState<0 | 1 | 2 | 3>(taak.prioriteit ?? 0)
  const [zeker, setZeker] = useState(false)
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onDicht()
    document.addEventListener('keydown', esc)
    return () => document.removeEventListener('keydown', esc)
  }, [onDicht])
  const v = m.taken.cat(taak)
  const opslaan = () => {
    const schoon = tekst.trim()
    if (!schoon) return
    // Andere tekst = punten opnieuw afleiden (behalve als ze al afgevinkt werden en de tekst gelijk bleef).
    onBewaar({
      ...taak,
      tekst: schoon,
      subtaken: schoon === taak.tekst ? taak.subtaken : undefined,
      later: plan === 'later' ? true : undefined,
      gepland: plan === 'vandaag' ? m.vandaag : plan === 'auto' ? null : taak.gepland ?? null,
      prioriteit: prio ? prio : null,
      bijgewerkt: nuISO(),
    })
    onDicht()
  }
  return (
    <div className="d-sheet" role="dialog" aria-modal="true" aria-labelledby="taak-titel">
      <div className="d-sheet-waas" onClick={onDicht} />
      <div className="d-sheet-paneel">
        <h2 id="taak-titel" className="d-sheet-titel">Taak</h2>
        <p className="d-sub" style={{ margin: '0 0 14px' }}>Gemaakt {korteDag(taak.gemaakt.slice(0, 10))} · {v}</p>
        <textarea id="taak-tekst" className="d-tekstvak" rows={4} value={tekst} onChange={(e) => setTekst(e.target.value)} />
        <div className="d-veld">
          <span>Planning</span>
          <div className="d-seg">
            <button type="button" aria-selected={plan === 'auto'} onClick={() => setPlan('auto')}>Laat mij kiezen</button>
            <button type="button" aria-selected={plan === 'vandaag'} onClick={() => setPlan('vandaag')}>Vandaag</button>
            <button type="button" aria-selected={plan === 'later'} onClick={() => setPlan('later')}>Later</button>
          </div>
        </div>
        <div className="d-veld">
          <span>Prioriteit</span>
          <div className="d-seg">
            <button type="button" aria-selected={prio === 0} onClick={() => setPrio(0)}>Auto</button>
            {([1, 2, 3] as const).map((n) => <button key={n} type="button" aria-selected={prio === n} onClick={() => setPrio(n)}>{PRIO_NAAM[n]}</button>)}
          </div>
        </div>
        <div className="d-knoppen" style={{ justifyContent: 'space-between' }}>
          {zeker ? (
            <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span className="d-mut" style={{ fontSize: 14 }}>Echt verwijderen?</span>
              <button type="button" className="d-knop" style={{ background: 'var(--red)' }} onClick={() => { onBewaar({ ...taak, verwijderd: true, bijgewerkt: nuISO() }); onDicht() }}>Verwijderen</button>
              <button type="button" className="d-knop zacht" onClick={() => setZeker(false)}>Nee</button>
            </span>
          ) : (
            <button type="button" className="d-knop zacht" style={{ color: 'var(--red)', background: 'color-mix(in srgb, var(--red) 12%, transparent)' }} onClick={() => setZeker(true)}>Verwijderen</button>
          )}
          <span style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="d-knop zacht" onClick={onDicht}>Annuleren</button>
            <button type="button" className="d-knop" onClick={opslaan} disabled={!tekst.trim()}>Bewaren</button>
          </span>
        </div>
      </div>
    </div>
  )
}

export function TakenPagina({ m, onTaakBewaar, onTaakToevoegen }: PaginaProps) {
  const [nieuw, setNieuw] = useState('')
  const [open, setOpen] = useState<Taak | null>(null)
  const opWerk = useOpWerkKlaar(m.vandaag)
  const voegToe = () => { const t = nieuw.trim(); if (t) { onTaakToevoegen(t); setNieuw('') } }

  const groepen: { titel: string; items: { taak: Taak; toel?: string }[] }[] = [
    { titel: 'Eerst', items: [] }, { titel: 'Daarna', items: [] }, { titel: 'Mag wachten', items: [] },
    { titel: 'Nog niet gesorteerd', items: [] }, { titel: 'Later (zelf gekozen)', items: [] },
  ]
  for (const { taak, v } of m.taken.overig) {
    const p = m.taken.prio(taak)
    const g = taak.later ? 4 : p ? p - 1 : 3
    groepen[g].items.push({ taak, toel: v?.toelichting })
  }

  return (
    <div className="d-pagina smal">
      <h1 className="d-h1">Taken</h1>
      <p className="d-sub">Ik kies er elke ochtend 1 tot 3 voor vandaag. Tik op een taak om hem zelf te plannen of aan te passen.</p>
      <div className="d-lijst">
        <div className="d-rij">
          <input className="d-invoer" id="nieuwe-taak" value={nieuw} placeholder="Wat schiet je te binnen?" onChange={(e) => setNieuw(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && voegToe()} />
          {nieuw.trim() && <button type="button" className="d-knop" style={{ height: 32 }} onClick={voegToe}>Voeg toe</button>}
        </div>
      </div>

      <h2 className="d-h2">Voor vandaag</h2>
      <div className="d-lijst">
        {m.taken.gekozen.length ? m.taken.gekozen.map(({ taak, v, ligt }) => (
          <TaakRij key={taak.id} m={m} taak={taak} onBewaar={onTaakBewaar} onOpen={() => setOpen(taak)}
            sub={[taak.gepland === m.vandaag ? 'zelf gepland' : m.taken.cat(taak), ligt > 0 ? `ligt al ${ligt} ${ligt === 1 ? 'dag' : 'dagen'}` : null, v?.toelichting].filter(Boolean).join(' · ')} />
        )) : <div className="d-rij"><span className="tekst d-mut">Niets gepland voor vandaag.</span></div>}
      </div>

      {groepen.filter((g) => g.items.length).map((g) => (
        <div key={g.titel}>
          <h2 className="d-h2">{g.titel}</h2>
          <div className="d-lijst">
            {g.items.map(({ taak, toel }) => (
              <TaakRij key={taak.id} m={m} taak={taak} onBewaar={onTaakBewaar} onOpen={() => setOpen(taak)}
                sub={[m.taken.cat(taak), toel].filter(Boolean).join(' · ')} />
            ))}
          </div>
        </div>
      ))}

      {m.opWerk.length > 0 && (
        <>
          <h2 className="d-h2">Op werk checken</h2>
          <div className="d-lijst">
            {m.opWerk.map((w) => (
              <div key={w} className="d-rij" data-klaar={opWerk.klaar.includes(w) || undefined}>
                <Vinkje aan={opWerk.klaar.includes(w)} onClick={() => opWerk.wissel(w)} label={`Afvinken: ${w}`} />
                <span className="tekst"><span className="d-vink-tekst">{w}</span></span>
              </div>
            ))}
          </div>
          <p className="d-voetnoot">Een foto van het etiket is genoeg. Afvinken geldt voor vandaag, op dit toestel.</p>
        </>
      )}

      <h2 className="d-h2">Deze week afgerond</h2>
      <div className="d-lijst">
        {m.taken.afgerond.length ? m.taken.afgerond.map((t) => (
          <TaakRij key={t.id} m={m} taak={t} onBewaar={onTaakBewaar} onOpen={() => setOpen(t)}
            sub={`afgevinkt ${t.klaarOp ? korteDag(t.klaarOp.slice(0, 10)) : ''}`} />
        )) : <div className="d-rij"><span className="tekst d-mut">Nog niets afgevinkt deze week.</span></div>}
      </div>
      <p className="d-voetnoot">Per ongeluk afgevinkt? Tik op het rondje, dan staat hij weer open. Afgeronde taken verdwijnen na een week.</p>

      {open && <Bewerk m={m} taak={open} onBewaar={onTaakBewaar} onDicht={() => setOpen(null)} />}
    </div>
  )
}

