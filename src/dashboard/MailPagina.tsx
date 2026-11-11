import { useState } from 'react'
import { korteDag } from './model'
import type { Groep } from './typen'
import type { PaginaProps } from './Paginas'

/** Mail & Guestplan (sinds 11 nov 2026, ronde per onderdeel): inbox geordend op soort, groepenoverzicht met
 *  status per groep, en het Guestplan-logboek van de laatste 14 dagen. */

const SOORTEN: { k: string; naam: string }[] = [
  { k: 'reservering', naam: 'Reserveringen' }, { k: 'groep', naam: 'Groepen' }, { k: 'leverancier', naam: 'Leveranciers' },
  { k: 'hoofdkantoor', naam: 'Hoofdkantoor' }, { k: 'administratie', naam: 'Administratie' }, { k: 'factuur', naam: 'Facturen' },
  { k: 'overig', naam: 'Overig' },
]
const MAAND = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december']

function Status({ tekst, soort }: { tekst: string; soort: 'goed' | 'let' | 'mut' | 'slecht' }) {
  const kleur = soort === 'goed' ? 'var(--green)' : soort === 'let' ? 'var(--orange)' : soort === 'slecht' ? 'var(--red)' : 'var(--label2)'
  return <span className="d-status" style={{ color: kleur, background: `color-mix(in srgb, ${kleur} 13%, transparent)` }}>{tekst}</span>
}

function GroepRij({ g }: { g: Groep }) {
  const dicht = g.status === 'afgewezen'
  return (
    <div className="d-rij d-groep" data-dicht={dicht || undefined}>
      <span className="d-groepdatum"><b>{Number(g.datum.slice(8))}</b><small>{korteDag(g.datum).split(' ')[0]}</small></span>
      <span className="tekst">
        <span>{g.naam} <span className="d-mut">· {g.aantal ?? '?'} p{g.tijd ? ` · ${g.tijd}` : ''}</span></span>
        <span className="d-statussen">
          {g.status !== 'staat erin' && <Status tekst={g.status} soort={g.status === 'niet ingevoerd' ? 'let' : g.status === 'afgewezen' ? 'mut' : 'slecht'} />}
          {!dicht && <Status tekst={g.menu === 'binnen' ? 'menu binnen' : g.menu === 'volgt' ? 'menu volgt' : g.menu === 'a la carte' ? 'à la carte' : 'menu onbekend'} soort={g.menu === 'binnen' || g.menu === 'a la carte' ? 'goed' : g.menu === 'volgt' ? 'let' : 'mut'} />}
          {g.pdf && <Status tekst="PDF klaar" soort="goed" />}
          {g.drank && !dicht && <Status tekst={g.drank} soort="mut" />}
        </span>
        {g.bijzonder && <small>{g.bijzonder}</small>}
        {g.open.length > 0 && <small className="d-let">Open: {g.open.join(' · ')}</small>}
      </span>
    </div>
  )
}

export function MailPagina({ m }: PaginaProps) {
  const r = m.rapport
  const [filter, setFilter] = useState<'alle' | 'open' | 'menu'>('alle')
  const [alleDagen, setAlleDagen] = useState(false)
  const [open, setOpen] = useState<string | null>(null)

  const regels = r?.mail?.regels ?? []
  const urgent = regels.filter((x) => x.urgent)
  const perSoort = SOORTEN.map((s) => ({ ...s, items: regels.filter((x) => !x.urgent && (x.soort ?? 'overig') === s.k) })).filter((s) => s.items.length)
  const onbekend = regels.filter((x) => !x.urgent && x.soort && !SOORTEN.some((s) => s.k === x.soort))

  const groepen = (r?.groepen ?? []).filter((g) => filter === 'alle' || (filter === 'open' ? g.open.length > 0 : g.menu === 'volgt' || g.menu === 'onbekend'))
  const actief = groepen.filter((g) => g.status !== 'afgewezen')
  const afgewezen = groepen.filter((g) => g.status === 'afgewezen')
  const perMaand = actief.reduce<Record<string, Groep[]>>((acc, g) => { (acc[g.datum.slice(0, 7)] ??= []).push(g); return acc }, {})
  const alle = r?.groepen ?? []
  const menuVolgt = alle.filter((g) => g.status !== 'afgewezen' && g.menu === 'volgt').length
  const metOpen = alle.filter((g) => g.open.length > 0).length

  const log = r?.guestplanLog ?? []
  const perDag = log.reduce<Record<string, typeof log>>((acc, x) => { (acc[x.op] ??= []).push(x); return acc }, {})
  const dagen = Object.keys(perDag).sort().reverse()

  return (
    <div className="d-pagina">
      <h1 className="d-h1">Mail & Guestplan</h1>
      <p className="d-sub">{r?.mail ? `${r.mail.threads} threads · ${r.mail.nieuw} nieuw · ${r.mail.concepten} concepten klaar` : 'Nog geen mailrapport'}</p>
      {r && !m.rapportVanVandaag && <p className="d-voetnoot" style={{ margin: '-12px 0 18px' }}>Rapport van {korteDag(r.datum)}: de ochtendroutine heeft vandaag nog niet gedraaid.</p>}

      <div className="d-logboek">
        <div>
          {/* Inbox */}
          {urgent.length > 0 && (
            <>
              <h2 className="d-h2" style={{ color: 'var(--red)' }}>Dringend</h2>
              <div className="d-lijst">{urgent.map((x) => <div key={x.wie} className="d-rij"><span className="tekst">{x.wie}<small>{x.wat}</small></span><span className="waarde">{x.concept ? 'Concept klaar' : 'Gemeld'}</span></div>)}</div>
            </>
          )}
          {[...perSoort, ...(onbekend.length ? [{ k: 'x', naam: 'Overig', items: onbekend }] : [])].map((s) => (
            <div key={s.k}>
              <h2 className="d-h2">{s.naam}</h2>
              <div className="d-lijst">{s.items.map((x) => <div key={x.wie + x.wat} className="d-rij"><span className="tekst">{x.wie}<small>{x.wat}</small></span><span className={`waarde ${x.concept ? 'd-goed' : ''}`}>{x.concept ? 'Concept klaar' : 'Gemeld'}</span></div>)}</div>
            </div>
          ))}
          {!regels.length && <div className="d-lijst"><div className="d-rij"><span className="tekst d-mut">Geen mail in het rapport.</span></div></div>}
          {!!r?.wachtOp?.length && (<><h2 className="d-h2">Wacht nog op</h2><div className="d-lijst">{r.wachtOp.map((x) => <div key={x} className="d-rij"><span className="tekst">{x}</span></div>)}</div></>)}
          {!!r?.nietIngevoerd?.length && (<><h2 className="d-h2">Niet ingevoerd</h2><div className="d-lijst">{r.nietIngevoerd.map((x) => <div key={x} className="d-rij"><span className="tekst">{x}</span></div>)}</div></>)}

          {/* Guestplan-logboek */}
          <h2 className="d-h2" style={{ marginTop: 28 }}>Guestplan-logboek · 14 dagen</h2>
          {dagen.length ? (
            <>
              {dagen.slice(0, alleDagen ? undefined : 3).map((d) => (
                <div key={d} style={{ marginBottom: 12 }}>
                  <div className="d-dagkopje">{d === m.vandaag ? 'Vandaag' : korteDag(d)} · {perDag[d].length} {perDag[d].length === 1 ? 'wijziging' : 'wijzigingen'}</div>
                  <div className="d-lijst">
                    {perDag[d].map((x, i) => {
                      const sleutel = `${d}-${i}`
                      const ingeklapt = open !== sleutel
                      return (
                        <button key={sleutel} type="button" className="d-rij d-logregel" onClick={() => setOpen(ingeklapt ? sleutel : null)} aria-expanded={!ingeklapt}>
                          <span className="tekst">
                            <span>{x.naam} <span className="d-mut">· {x.datum ? korteDag(x.datum) : x.datumTekst} · {x.tijd} · {x.aantal} p</span></span>
                            <small className={ingeklapt ? 'kort' : ''}>{x.wat}</small>
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
              {dagen.length > 3 && <button type="button" className="d-knop zacht" onClick={() => setAlleDagen(!alleDagen)}>{alleDagen ? 'Minder' : `Alle ${dagen.length} dagen`}</button>}
              <p className="d-voetnoot">Uit het reserveringen-logboek van de routine. Telefoonnummers en mailadressen staan er bewust niet in. Tik op een regel voor de hele tekst.</p>
            </>
          ) : <div className="d-lijst"><div className="d-rij"><span className="tekst d-mut">Nog niets ingevoerd in de laatste 14 dagen.</span></div></div>}
        </div>

        <div>
          {/* Groepen */}
          <h2 className="d-h2">Groepen ≥ 12</h2>
          <section className="d-duiding" style={{ marginBottom: 12 }}>
            <div className="d-signalen" style={{ marginTop: 0 }}>
              <span className="rustig" style={{ background: 'var(--fill)', color: 'var(--label)' }}>{alle.filter((g) => g.status !== 'afgewezen').length} komende groepen</span>
              {menuVolgt > 0 && <span>{menuVolgt} wachten op menu</span>}
              {metOpen > 0 && <span>{metOpen} met open punten</span>}
            </div>
          </section>
          <div className="d-seg" style={{ marginBottom: 12 }}>
            <button type="button" aria-selected={filter === 'alle'} onClick={() => setFilter('alle')}>Alle</button>
            <button type="button" aria-selected={filter === 'open'} onClick={() => setFilter('open')}>Open punten</button>
            <button type="button" aria-selected={filter === 'menu'} onClick={() => setFilter('menu')}>Menu nog niet binnen</button>
          </div>
          {Object.entries(perMaand).map(([mnd, gs]) => (
            <div key={mnd} style={{ marginBottom: 12 }}>
              <div className="d-dagkopje">{MAAND[Number(mnd.slice(5)) - 1].replace(/^./, (c) => c.toUpperCase())} {mnd.slice(0, 4)}</div>
              <div className="d-lijst">{gs.map((g) => <GroepRij key={g.naam + g.datum} g={g} />)}</div>
            </div>
          ))}
          {afgewezen.length > 0 && (
            <div>
              <div className="d-dagkopje">Afgewezen</div>
              <div className="d-lijst">{afgewezen.map((g) => <GroepRij key={g.naam + g.datum} g={g} />)}</div>
            </div>
          )}
          {!groepen.length && <div className="d-lijst"><div className="d-rij"><span className="tekst d-mut">Geen groepen in deze selectie.</span></div></div>}
          <p className="d-voetnoot">De routine houdt deze lijst bij als ze een groep aanraakt (mail, Guestplan, menu-PDF). "Onbekend" = nog niet gecontroleerd in Guestplan.</p>
        </div>
      </div>
    </div>
  )
}
