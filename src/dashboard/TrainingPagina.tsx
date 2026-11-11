import { useState } from 'react'
import type { OefeningPunt } from '../types'
import { Pijl, Spark } from './teken'
import { TijdGrafiek } from './TijdGrafiek'
import { komma, korteDag, parseTraining, perDag, type Model, type Oefening } from './model'
import type { PaginaProps } from './Paginas'

/** Training (sinds 11 nov 2026, ronde per onderdeel): signalen, de afgelopen 2 weken met de
 *  rotatie, de training van vandaag óf de volgende, en voortgang per oefening met reflectie. */

const kg = (n: number) => komma(n, n % 1 ? (Math.round(n * 100) % 10 ? 2 : 1) : 0)
const topset = (r: OefeningPunt) => `${kg(r.top_gewicht)} × ${r.top_reps}`
const letter = (titel: string | null) => (titel?.match(/\b([A-D])$/)?.[1] ?? '•')

/** Naam uit de brief ("Db lateral raise") koppelen aan de sleutel in de dataset ("DB lateral raise"). */
function sleutelVoor(m: Model, naam: string) {
  const ks = Object.keys(m.dataset?.oefeningen ?? {})
  return ks.find((k) => k.toLowerCase() === naam.toLowerCase()) ?? null
}


function Oefeningdetail({ m, naam, gepland, onTerug }: { m: Model; naam: string; gepland?: Oefening; onTerug: () => void }) {
  const [maat, setMaat] = useState<'e1rm' | 'top' | 'volume'>('e1rm')
  const [alles, setAlles] = useState(false)
  const rijen = m.dataset?.oefeningen[naam] ?? []
  const zicht = alles ? rijen : rijen.slice(-12)
  const waarde = (r: OefeningPunt) => (maat === 'e1rm' ? r.e1rm : maat === 'top' ? r.top_gewicht : r.volume)
  const fmt = (n: number) => (maat === 'volume' ? `${Math.round(n).toLocaleString('nl-NL')} kg` : `${kg(Math.round(n * 10) / 10)} kg`)
  const reflectie = m.dataset?.oefening_reflectie?.[naam]?.tekst
  const laatste = rijen.at(-1)
  return (
    <div className="d-pagina smal">
      <button type="button" className="d-terug" onClick={onTerug}><Pijl />Training</button>
      <h1 className="d-h1">{naam}</h1>
      <p className="d-sub">{rijen.length ? `${rijen.length} sessies in 6 maanden · laatste ${korteDag(laatste!.datum)}: ${topset(laatste!)}` : 'Nog geen sessies in Hevy'}</p>

      {reflectie && (
        <section className="d-duiding">
          <div className="d-duiding-kop" style={{ color: 'var(--green)' }}>Hoe het gaat</div>
          <p>{reflectie}</p>
        </section>
      )}

      {rijen.length > 0 && (
        <>
          <div className="d-lijst d-grafiek" style={{ marginTop: 20 }}>
            <div className="d-seg" role="tablist" aria-label="Maat">
              <button type="button" role="tab" aria-selected={maat === 'e1rm'} onClick={() => setMaat('e1rm')}>Geschatte max</button>
              <button type="button" role="tab" aria-selected={maat === 'top'} onClick={() => setMaat('top')}>Topgewicht</button>
              <button type="button" role="tab" aria-selected={maat === 'volume'} onClick={() => setMaat('volume')}>Volume</button>
            </div>
            <div style={{ height: 14 }} />
            <TijdGrafiek punten={zicht.map((r) => ({ datum: r.datum, waarde: waarde(r) }))} kleur="var(--green)" formatteer={fmt} />
            <div className="d-grafiek-voet">
              <span>Per sessie{maat === 'e1rm' ? ' · geschat uit je beste set' : ''}</span>
              <div className="d-seg klein" role="tablist" aria-label="Periode">
                <button type="button" role="tab" aria-selected={!alles} onClick={() => setAlles(false)}>Laatste 12</button>
                <button type="button" role="tab" aria-selected={alles} onClick={() => setAlles(true)}>Alles</button>
              </div>
            </div>
          </div>
          <p className="d-voetnoot">Brede lijn = gemiddelde van de laatste sessies. Tik of beweeg over de grafiek voor een sessie.</p>
        </>
      )}

      {gepland && (
        <>
          <h2 className="d-h2">{m.dag.rust ? 'Volgende keer' : 'Vandaag'}</h2>
          <div className="d-lijst">
            <div className="d-sets" style={{ paddingTop: 14 }}>{gepland.sets.map((s, j) => <span key={j}>{s}</span>)}</div>
            {!!gepland.noten.length && <ul className="d-noten">{gepland.noten.map((n, j) => <li key={j}>{n}</li>)}</ul>}
          </div>
        </>
      )}

      {rijen.length > 0 && (
        <>
          <h2 className="d-h2">Laatste sessies</h2>
          <div className="d-lijst">
            {rijen.slice(-8).reverse().map((r) => (
              <div key={r.datum} className="d-rij">
                <span className="tekst">{korteDag(r.datum)}<small>{r.sets} sets · {r.volume.toLocaleString('nl-NL')} kg volume{r.vlag && /fatigue/i.test(r.vlag) ? ' · mindere dag' : ''}</small></span>
                <span className="waarde">{topset(r)}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export function TrainingPagina({ m, onNaar, onNotitie }: PaginaProps) {
  const [open, setOpen] = useState<string | null>(null)
  const dagen = m.dataset?.schema_dagen ?? {}
  const rotatie = Object.keys(dagen).filter((d) => d !== 'D')
  const [dagKeuze, setDagKeuze] = useState<string>(() => m.training.volgende?.dagnaam ?? m.brief?.dagnaam ?? rotatie[0] ?? 'A')

  const tekst = m.training.tekst ?? m.training.volgende?.tekst ?? null
  const t = tekst ? parseTraining(tekst) : null
  const titel = m.dag.rust ? m.training.volgende?.titel ?? m.dag.volgende : m.dag.titel

  if (open) {
    const gepland = t?.oefeningen.find((o) => sleutelVoor(m, o.naam) === open)
    return <Oefeningdetail m={m} naam={open} gepland={gepland} onTerug={() => { setOpen(null); window.scrollTo(0, 0) }} />
  }
  const openen = (naam: string | null) => { if (naam) { setOpen(naam); window.scrollTo(0, 0) } }

  // De afgelopen 14 dagen: welke training wanneer.
  const sessies = m.dataset?.sessies ?? []
  const veertien = perDag(sessies, 14, () => 1).map((p) => ({ ...p, sessie: sessies.find((s) => s.datum === p.datum) }))
  const aantal = veertien.filter((d) => d.sessie).length

  return (
    <div className="d-pagina smal">
      <h1 className="d-h1">{m.dag.rust ? 'Training' : titel}</h1>
      <p className="d-sub">{m.dag.rust ? `Vandaag rust · volgende: ${titel ?? 'onbekend'}` : t?.titel?.split('—')[1]?.trim() ?? 'Vandaag'}</p>

      {m.training.signalen.length > 0 && (
        <section className="d-duiding" style={{ marginBottom: 20 }}>
          <div className="d-duiding-kop">Let op</div>
          <ul className="d-signaallijst">
            {m.training.signalen.map((s, j) => (
              <li key={j}><span className={`d-badge ${s.soort === 'pijn' ? 'rood' : ''}`}>{s.soort === 'pijn' ? 'pijn' : 'stagnatie'}</span>
                {s.oefening && s.soort === 'stagnatie' ? <b>{s.oefening}: </b> : null}{s.tekst}</li>
            ))}
          </ul>
        </section>
      )}

      <div className="d-lijst d-grafiek">
        <div className="kop"><b className="d-num">{aantal}<small>trainingen in 14 dagen</small></b><span>{rotatie.length ? `rotatie ${rotatie.join(' → ')}, dan rust` : ''}</span></div>
        <div className="d-week">
          {veertien.map((d) => {
            const vandaag = d.datum === m.vandaag
            return (
              <div key={d.datum} className={`d-weekdag ${vandaag ? 'nu' : ''}`}>
                <small>{'zmdwdvz'[new Date(`${d.datum}T12:00:00`).getDay()]}</small>
                <span className={d.sessie ? 'gedaan' : ''} title={d.sessie?.titel ?? 'rust'}>{d.sessie ? letter(d.sessie.titel) : ''}</span>
                <small>{Number(d.datum.slice(8))}</small>
              </div>
            )
          })}
        </div>
        <p className="d-voetnoot" style={{ margin: '10px 0 0' }}>
          Volgende: <b style={{ color: 'var(--label)' }}>{m.dag.rust ? titel : `vandaag ${titel}`}</b>
          {sessies.at(-1) ? ` · laatst: ${sessies.at(-1)!.titel ?? 'training'} op ${korteDag(sessies.at(-1)!.datum)}${sessies.at(-1)!.duur_min ? `, ${sessies.at(-1)!.duur_min} min` : ''}` : ''}
        </p>
      </div>

      <h2 className="d-h2">{m.dag.rust ? `Volgende keer · ${titel ?? ''}` : 'Vandaag'}</h2>
      {t ? (
        <>
          {!!t.algemeen.length && <div className="d-lijst">{t.algemeen.map((a, j) => <div key={j} className="d-rij"><span className="tekst" style={{ fontSize: 14 }}>{a}</span></div>)}</div>}
          <div className="d-oefkaarten">
            {t.oefeningen.map((o) => {
              const k = sleutelVoor(m, o.naam)
              return (
                <button key={o.naam} type="button" className="d-oefkaart" onClick={() => openen(k)} disabled={!k}>
                  <div className="kop"><b>{k ?? o.naam}</b>{k && <Pijl />}</div>
                  <div className="d-sets" style={{ padding: '8px 0 0' }}>{o.sets.map((s, j) => <span key={j}>{s}</span>)}</div>
                  {!!o.noten.length && <ul className="d-noten" style={{ padding: '8px 0 0' }}>{o.noten.slice(0, 3).map((n, j) => <li key={j}>{n}</li>)}</ul>}
                </button>
              )
            })}
          </div>
          {m.dag.rust && <p className="d-voetnoot">Het voorstel van de rekenmachine. Op de dag zelf stem ik het af op je herstel en notities.</p>}
        </>
      ) : <div className="d-lijst"><div className="d-rij"><span className="tekst d-mut">Nog geen training in de brief.</span></div></div>}

      <h2 className="d-h2">Voortgang per oefening</h2>
      {rotatie.length > 0 && (
        <div className="d-seg" role="tablist" aria-label="Trainingsdag" style={{ marginBottom: 10 }}>
          {rotatie.map((d) => <button key={d} type="button" role="tab" aria-selected={dagKeuze === d} onClick={() => setDagKeuze(d)}>{dagen[d].titel}</button>)}
        </div>
      )}
      <div className="d-lijst">
        {(dagen[dagKeuze]?.oefeningen ?? []).map((naam) => {
          const rijen = m.dataset?.oefeningen[naam] ?? []
          const pct = m.dataset?.oefening_reflectie?.[naam]?.pct ?? null
          return (
            <button key={naam} type="button" className="d-rij" onClick={() => openen(naam)} disabled={!rijen.length}>
              <span className="tekst">{naam}<small>{rijen.length ? `laatst ${topset(rijen.at(-1)!)} · ${korteDag(rijen.at(-1)!.datum)}` : 'nog geen sessies'}</small></span>
              <span style={{ width: 70, flex: 'none' }}>{rijen.length > 1 && <Spark waarden={rijen.slice(-8).map((r) => r.e1rm ?? 0)} h={26} kleur="var(--green)" />}</span>
              <span className={`waarde ${pct == null ? '' : pct >= 3 ? 'd-goed' : pct <= -3 ? 'd-let' : ''}`} style={{ minWidth: 44 }}>{pct == null ? '–' : `${pct > 0 ? '+' : ''}${pct}%`}</span>
              <span className="chev"><Pijl /></span>
            </button>
          )
        })}
      </div>
      <p className="d-voetnoot">Percentage = verandering van je geschatte max in de laatste 8 weken (vanaf een nieuwe beginlijn als het schema is aangepast). Tik voor de grafiek en de reflectie.</p>

      <h2 className="d-h2">Vorige keer</h2>
      <div className="d-lijst">
        <div className="d-rij"><span className="tekst">{m.training.vorige?.kop ?? 'Geen notitie gevonden.'}{m.training.vorige && <small>{m.training.vorige.tekst.join(' ')}</small>}</span></div>
      </div>
      <div className="d-knoppen">
        <button type="button" className="d-knop" onClick={onNotitie}>Notitie schrijven</button>
        <button type="button" className="d-knop zacht" onClick={() => onNaar('logboek')}>Naar het logboek</button>
      </div>
    </div>
  )
}
