import { useState } from 'react'
import { TijdGrafiek } from './TijdGrafiek'
import { Balk, Staven } from './teken'
import { eur, komma, korteDag, perDag } from './model'
import type { PaginaProps } from './Paginas'

/** Omzet (sinds 11 nov 2026, ronde per onderdeel): gisteren in cijfers + wat opviel, loon tegen 27%,
 *  voorstel ↔ echt, week en maand (met vorig jaar), verkoopmix, en een blok alleen voor Jens. */

const MAAND = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec']
const plus = (n: number) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${eur(Math.abs(n))}`
const DAGNAAM = ['', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag', 'zondag']

function Stat({ label, waarde, sub, kleur }: { label: string; waarde: string; sub?: string; kleur?: string }) {
  return (
    <div className="d-stat">
      <span>{label}</span>
      <b className="d-num">{waarde}</b>
      {sub && <small className={kleur}>{sub}</small>}
    </div>
  )
}

export function OmzetPagina({ m }: PaginaProps) {
  const g = m.bregje?.gisteren
  const [metJens, setMetJens] = useState(true)
  const [heelRapport, setHeelRapport] = useState(false)
  if (!g) return <div className="d-pagina smal"><h1 className="d-h1">Omzet</h1><p className="d-sub">Nog geen kassarapport verwerkt.</p></div>

  const verschil = g.gemWeekdag != null ? g.gembes - g.gemWeekdag : null
  const opvallend = [
    ...(g.kansen ?? []).filter((k) => k.opvallend && k.nu != null && k.normaal != null)
      .map((k) => `${k.categorie[0].toUpperCase()}${k.categorie.slice(1)}: ${Math.round(k.nu!)} per 100 couverts (normaal ${Math.round(k.normaal!)})`),
    ...(g.mix ?? []).filter((x) => x.normaal != null && Math.abs(x.aandeel - x.normaal) >= 3)
      .map((x) => `${x.groep} ${Math.round(x.aandeel)}% van de omzet (normaal ${Math.round(x.normaal!)}%)`),
  ]
  const letOp = g.regels.filter((r) => r.startsWith('Let op:')).map((r) => r.replace(/^Let op:\s*/, ''))
  const loonPunten = perDag((g.loonReeks ?? []).map((x) => ({ ...x })), 28, (x) => (metJens ? x.pct : x.pctZonderJens))
  const loonDagen = loonPunten.filter((p) => p.waarde != null)
  const boven = loonDagen.filter((p) => p.waarde! > 27).length
  const ve = g.voorstelEcht
  const c = g.contract
  const maxMix = Math.max(1, ...(g.mix ?? []).map((x) => Math.max(x.aandeel, x.normaal ?? 0)))

  return (
    <div className="d-pagina">
      <h1 className="d-h1">Omzet</h1>
      <p className="d-sub">{DAGNAAM[g.weekdag]} {korteDag(g.datum).split(' ')[1]}{g.besteVan ? ` · beste ${DAGNAAM[g.weekdag]} van de laatste ${g.besteVan}` : ''}</p>

      {/* 1. Gisteren */}
      <div className="d-stats4">
        <Stat label="Gembes" waarde={eur(g.gembes, 2)} sub={verschil != null ? `${verschil >= 0 ? '+' : '−'}${eur(Math.abs(verschil), 2)} t.o.v. gem. ${DAGNAAM[g.weekdag]}` : undefined} kleur={verschil != null ? (verschil >= 0 ? 'd-goed' : 'd-let') : ''} />
        <Stat label="Couverts" waarde={komma(g.couverts, g.couverts % 1 ? 1 : 0)} />
        <Stat label="Omzet" waarde={eur(g.omzet)} sub={`${eur(g.omzetEx)} zonder btw`} />
        <Stat label="Loon" waarde={g.loon ? `${komma(g.loon.pct)}%` : '–'} sub={g.loon ? `${eur(g.loon.kosten)} · doel ${eur(g.loon.budget)}` : 'geen urenregistratie'} kleur={g.loon ? (g.loon.pct > 27 ? 'd-let' : 'd-goed') : ''} />
      </div>
      {(opvallend.length > 0 || letOp.length > 0) && (
        <section className="d-duiding" style={{ marginTop: 14 }}>
          <div className="d-duiding-kop" style={{ color: 'var(--teal)' }}>Wat opviel</div>
          <ul className="d-signaallijst">
            {opvallend.map((x) => <li key={x}>{x}</li>)}
            {letOp.map((x) => <li key={x}><span className="d-badge">let op</span>{x}</li>)}
          </ul>
        </section>
      )}

      {/* 2. Loon tegen 27% */}
      <h2 className="d-h2" style={{ marginTop: 28 }}>Loon tegen 27%</h2>
      <div className="d-lijst d-grafiek">
        <div className="d-seg" style={{ maxWidth: 320 }}>
          <button type="button" aria-selected={metJens} onClick={() => setMetJens(true)}>Met Jens</button>
          <button type="button" aria-selected={!metJens} onClick={() => setMetJens(false)}>Zonder Jens</button>
        </div>
        <div style={{ height: 12 }} />
        <TijdGrafiek punten={loonPunten} kleur="var(--teal)" soort="staaf" formatteer={(n) => `${komma(n)}%`}
          doel={{ waarde: 27, label: '27%' }} kleurVoor={(v) => (v > 27 ? 'var(--orange)' : 'var(--teal)')} />
        <div className="d-grafiek-voet"><span>{boven} van {loonDagen.length} dagen boven 27% · laatste 4 weken</span></div>
      </div>
      {c && <p className="d-voetnoot">{c.maand[0].toUpperCase() + c.maand.slice(1)} {c.heel ? 'heel' : 'tot nu'} ({c.dagen} dagen): collega's {komma(c.collegasPct)}%, met Jens {komma(c.metJensPct)}%.</p>}

      {/* 3. Voorstel ↔ echt */}
      {ve && (
        <>
          <h2 className="d-h2" style={{ marginTop: 28 }}>Voorstel ↔ echt</h2>
          {ve.dag ? (
            <>
              <div className="d-twee">
                {(['keuken', 'bediening'] as const).map((afd) => {
                  const x = ve.dag!.perAfd[afd]
                  const mensen = ve.dag!.mensen.filter((p) => p.afdeling === afd)
                  return (
                    <div key={afd} className="d-lijst" style={{ marginBottom: 12 }}>
                      <div className="d-rij"><span className="tekst"><b>{afd === 'keuken' ? 'Keuken' : 'Voorkant'}</b><small>voorgesteld {eur(x.voorstel)} ({x.nVoorstel}) → echt {eur(x.echt)} ({x.nEcht})</small></span>
                        <span className={`waarde ${x.echt - x.voorstel > 5 ? 'd-let' : 'd-goed'}`}>{plus(Math.round(x.echt - x.voorstel))}</span></div>
                      {mensen.map((p) => (
                        <div key={p.naam} className="d-rij"><span className="tekst" style={{ fontSize: 14 }}>{p.naam}
                          <small>{p.voorstel ? `voorstel ${p.voorstel.van}–${p.voorstel.tot ?? `sluit (~${p.voorstel.sluit})`}` : 'niet in het voorstel'} · {p.echt ? `echt ${p.echt.van}–${p.echt.tot}` : 'niet ingeklokt'}</small></span>
                          <span className="waarde">{plus((p.echt?.kosten ?? 0) - (p.voorstel?.kosten ?? 0))}</span></div>
                      ))}
                    </div>
                  )
                })}
              </div>
            </>
          ) : <div className="d-lijst"><div className="d-rij"><span className="tekst d-mut">Geen voorstel of geen uren voor {korteDag(g.datum)}.</span></div></div>}
          {ve.avonden > 0 && (
            <div className="d-lijst d-grafiek">
              <div className="kop"><b className="d-num" style={{ fontSize: 20 }}>Sinds {ve.sinds ? korteDag(ve.sinds) : ''}<small>{ve.avonden} avonden</small></b>
                <span>keuken <b className={ve.totaal.keuken > 0 ? 'd-let' : 'd-goed'}>{plus(ve.totaal.keuken)}</b> · voorkant <b className={ve.totaal.bediening > 0 ? 'd-let' : 'd-goed'}>{plus(ve.totaal.bediening)}</b></span></div>
              {ve.perAvond.map((a) => (
                <div key={a.datum} className="d-rij" style={{ padding: 0, minHeight: 36 }}>
                  <span className="tekst" style={{ padding: '6px 0', fontSize: 14 }}>{korteDag(a.datum)}</span>
                  <span className="waarde" style={{ minWidth: 100 }}>keuken {plus(a.keuken)}</span>
                  <span className="waarde" style={{ minWidth: 110 }}>voorkant {plus(a.bediening)}</span>
                </div>
              ))}
              <p className="d-voetnoot" style={{ margin: '8px 0 0' }}>+ = meer uitgegeven dan voorgesteld. Een vergelijking met het plan, geen oordeel over personen: een avond kan ook drukker zijn.</p>
            </div>
          )}
        </>
      )}

      {/* 4. Week en maand */}
      <h2 className="d-h2" style={{ marginTop: 28 }}>Per week</h2>
      {g.weken?.length ? (
        <div className="d-lijst d-grafiek">
          <div className="kop"><b className="d-num" style={{ fontSize: 22 }}>{eur(g.weken.at(-1)!.omzet)}<small>deze week ({g.weken.at(-1)!.dagen} dagen)</small></b><span>gembes {g.weken.at(-1)!.gembes != null ? eur(g.weken.at(-1)!.gembes!, 2) : '–'}</span></div>
          <Staven waarden={g.weken.map((w) => (w.dagen >= 7 || w === g.weken!.at(-1) ? w.omzet : null))} h={80} kleur="var(--teal)" />
          <div className="d-weekas">{g.weken.map((w) => <small key={w.maandag}>{Number(w.maandag.slice(8))}/{Number(w.maandag.slice(5, 7))}</small>)}</div>
          <p className="d-voetnoot" style={{ margin: '8px 0 0' }}>Omzet per week (ma–zo), laatste 12 weken. Rechts de lopende week.</p>
        </div>
      ) : null}
      <h2 className="d-h2" style={{ marginTop: 22 }}>Per maand</h2>
      <div className="d-lijst">
        {[...(g.maanden ?? [])].reverse().map((x) => {
          const vj = x.vorigJaar
          const d = vj && x.heel ? Math.round(((x.omzet - vj.omzet) / vj.omzet) * 100) : null
          return (
            <div key={x.maand} className="d-rij">
              <span className="tekst">{MAAND[Number(x.maand.slice(5)) - 1]} {x.maand.slice(0, 4)}{!x.heel && <span className="d-label">tot nu</span>}
                <small>{komma(x.couverts, 0)} couverts · gembes {x.gembes != null ? eur(x.gembes, 2) : '–'} · {x.dagen} dagen{vj ? ` · vorig jaar ${eur(vj.omzet)}, gembes ${eur(vj.gembes, 2)}` : ''}</small></span>
              <span className="waarde" style={{ textAlign: 'right' }}>{eur(x.omzet)}{d != null && <><br /><b className={d >= 0 ? 'd-goed' : 'd-let'} style={{ fontSize: 13 }}>{d >= 0 ? '+' : ''}{d}% t.o.v. vorig jaar</b></>}</span>
            </div>
          )
        })}
      </div>
      <p className="d-voetnoot">Vorig jaar heb ik alleen van de maanden waarvan een maandrapport is ingelezen (nu aug–okt 2025). Een maand met minder dagen dan de kalender mist kassarapporten.</p>

      {/* 5. Verkoopmix */}
      {!!g.mix?.length && (
        <>
          <h2 className="d-h2" style={{ marginTop: 28 }}>Verkoopmix {korteDag(g.datum)}</h2>
          <div className="d-lijst d-grafiek">
            {g.mix.map((x) => (
              <div key={x.groep} className="d-mixrij">
                <span>{x.groep}</span>
                <span className="d-mixbalk">
                  <i style={{ width: `${(x.aandeel / maxMix) * 100}%` }} />
                  {x.normaal != null && <b style={{ left: `${(x.normaal / maxMix) * 100}%` }} title={`normaal ${komma(x.normaal)}%`} />}
                </span>
                <span className="d-num">{komma(x.aandeel, 0)}%<small> · {eur(x.omzet)}</small></span>
              </div>
            ))}
            <p className="d-voetnoot" style={{ margin: '10px 0 0' }}>Balk = aandeel in de omzet van die dag. Streepje = normaal op een {DAGNAAM[g.weekdag]} (laatste 8).</p>
          </div>
        </>
      )}

      {/* 6. Alleen voor jou */}
      {c && (
        <>
          <h2 className="d-h2" style={{ marginTop: 28 }}>Alleen voor jou</h2>
          <section className="d-prive">
            <div className="d-duiding-kop" style={{ color: 'var(--purple)' }}>Contractgesprek · {c.maand} {c.heel ? '' : 'tot nu'}</div>
            <div className="d-stats4" style={{ marginTop: 8 }}>
              <Stat label="Collega's" waarde={`${komma(c.collegasPct)}%`} sub={`grens ${komma(c.caseGrensPct)}%`} kleur={c.collegasPct <= c.caseGrensPct ? 'd-goed' : 'd-let'} />
              <Stat label="Met jou" waarde={`${komma(c.metJensPct)}%`} />
              <Stat label="Jij" waarde={`${komma(c.jensUren)} u`} sub={eur(c.jensKosten)} />
              <Stat label="Contract naar rato" waarde={eur(c.contractNaarRato)} sub={`${eur(c.contractNetto)} netto`} />
            </div>
            <div style={{ marginTop: 14 }}>
              <Balk pct={(c.collegasPct / 35) * 100} kleur={c.collegasPct <= c.caseGrensPct ? 'var(--green)' : 'var(--orange)'} doel={(c.caseGrensPct / 35) * 100} />
              <p className="d-voetnoot" style={{ margin: '8px 0 0' }}>De case klopt als de collega's gemiddeld onder {komma(c.caseGrensPct)}% blijven (quitte op jan–sep). Nu {komma(c.collegasPct)}%.</p>
            </div>
            <ul className="d-signaallijst" style={{ marginTop: 12 }}>
              <li>Op contract ({eur(c.contractNetto)} netto, schatting {eur(c.contractKosten)}/mnd): resultaat voor de zaak {eur(Math.abs(c.verschilZelfdeUren))} {c.verschilZelfdeUren > 0 ? 'lager' : 'hoger'} dan nu, bij dezelfde uren.</li>
              <li>{eur(Math.abs(c.verschilMetVervanging))} {c.verschilMetVervanging > 0 ? 'lager' : 'hoger'} als je {c.contractUren} u per maand maakt en daarmee senior-uren vervangt.</li>
            </ul>
            <p className="d-voetnoot" style={{ margin: '10px 0 0' }}>Het contractbedrag is een eigen schatting, geen loonstrook. Dit blok zie alleen jij; het staat niet in iets wat collega's zien.</p>
          </section>
        </>
      )}

      <button type="button" className="d-knop zacht" style={{ marginTop: 22 }} onClick={() => setHeelRapport(!heelRapport)}>{heelRapport ? 'Dagrapport verbergen' : 'Hele dagrapport'}</button>
      {heelRapport && <div className="d-lijst" style={{ marginTop: 10 }}>{g.regels.map((x, j) => <div key={j} className="d-rij"><span className="tekst" style={{ fontSize: 14 }}>{x.trim()}</span></div>)}</div>}
    </div>
  )
}
