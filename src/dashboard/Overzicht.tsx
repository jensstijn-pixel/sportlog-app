import { useState, type ReactNode } from 'react'
import type { Taak } from '../types'
import { Balk, Pijl, Ring, Spark, Staven, VinkIcoon, Vinkje } from './teken'
import { eur, komma, korteDag, perDag, uurMin, type Model } from './model'
import type { Pagina } from './Schil'

export type Invul = 'herstel' | 'gewicht' | 'schermtijd'

/** Afgevinkte acties uit het ochtendrapport: alleen op dit apparaat, per dag. */
export function useActiesKlaar(datum: string | undefined) {
  const sleutel = `daily.acties.${datum ?? ''}`
  const [klaar, setKlaar] = useState<number[]>(() => {
    try { return JSON.parse(localStorage.getItem(sleutel) ?? '[]') as number[] } catch { return [] }
  })
  const wissel = (i: number) => {
    const nieuw = klaar.includes(i) ? klaar.filter((x) => x !== i) : [...klaar, i]
    setKlaar(nieuw)
    try { localStorage.setItem(sleutel, JSON.stringify(nieuw)) } catch { /* privémodus: dan alleen deze sessie */ }
  }
  return { klaar, wissel }
}

function Kop({ kleur, naam, rechts, pijl }: { kleur: string; naam: string; rechts?: ReactNode; pijl?: boolean }) {
  return (
    <div className="d-w-kop">
      <span style={{ color: kleur }}>{naam}</span>
      <span className="tijd">{rechts}{pijl && <Pijl />}</span>
    </div>
  )
}

function Tegel({ maat, naar, onNaar, i, children }: { maat: 's' | 'm' | 'l'; naar?: Pagina; onNaar: (p: Pagina) => void; i: number; children: ReactNode }) {
  const style = { ['--i' as string]: i }
  return naar ? (
    <button type="button" className={`d-w ${maat} d-op`} style={style} onClick={() => onNaar(naar)}>{children}</button>
  ) : (
    <section className={`d-w ${maat} d-op`} style={style}>{children}</section>
  )
}

const tijdNaarUur = (t: string) => { const [h, m] = t.split(':').map(Number); return h + (m || 0) / 60 }

export function Overzicht({
  m, onNaar, onInvul, onTaakAfvinken,
}: {
  m: Model
  onNaar: (p: Pagina) => void
  onInvul: (i: Invul) => void
  onTaakAfvinken: (t: Taak, klaar: boolean) => void
}) {
  const r = m.rapport
  const acties = useActiesKlaar(r?.datum)
  const h = m.herstel.vandaag
  const bg = m.bregje?.gisteren
  const bv = m.bregje?.vandaag
  let i = 0

  const hrvDelta = h?.hrv != null && m.herstel.hrvGem ? Math.round(((h.hrv - m.herstel.hrvGem) / m.herstel.hrvGem) * 100) : null
  const herstelKleur = h?.readiness == null ? 'var(--label3)' : h.readiness >= 85 ? 'var(--green)' : h.readiness >= 70 ? 'var(--orange)' : 'var(--red)'
  const slaap = h?.slaapMinuten != null ? uurMin(h.slaapMinuten) : null
  const st = m.schermtijd.netto != null ? uurMin(m.schermtijd.netto) : null
  const stDelta = m.schermtijd.netto != null && m.schermtijd.week != null ? Math.round(m.schermtijd.netto - m.schermtijd.week) : null

  const sluitVan = (afd: string) => (afd === 'keuken' ? bv?.sluit.keuken : bv?.sluit.bediening) ?? '22:00'
  const gantt = (van: string, tot: string) => {
    const begin = 13, eind = 22.5
    const v = tijdNaarUur(van), e = tijdNaarUur(tot)
    return { left: `${((v - begin) / (eind - begin)) * 100}%`, width: `${((e - v) / (eind - begin)) * 100}%` }
  }

  return (
    <div className="d-pagina">
      <h1 className="d-h1">Goedemorgen</h1>
      <p className="d-sub">
        {m.dagLang} · {m.dag.titel.toLowerCase()}
        {m.dag.dienst ? ` · dienst ${m.dag.dienst.van}–${m.dag.dienst.tot}` : ''}
      </p>
      <div className="d-check" aria-label="Ochtend-checklist">
        {m.checklist.map((c) => {
          const inhoud = (<><span className="st">{c.klaar && <VinkIcoon />}</span>{c.label}{!c.klaar && <small>{c.detail}</small>}</>)
          return c.naar ? (
            <button key={c.id} type="button" className={`d-chip ${c.klaar ? '' : 'nee'}`} onClick={() => onInvul(c.naar!)}>{inhoud}</button>
          ) : (
            <span key={c.id} className={`d-chip ${c.klaar ? '' : 'nee'}`}>{inhoud}</span>
          )
        })}
      </div>

      <h2 className="d-h2" style={{ marginTop: 26 }}>Vraagt aandacht</h2>
      <div className="d-raster">
        <Tegel maat="l" onNaar={onNaar} i={i++}>
          <Kop kleur="var(--red)" naam="Jouw actie" rechts={r ? (m.rapportVanVandaag ? `${r.acties.length - acties.klaar.length} open` : `van ${korteDag(r.datum)}`) : undefined} />
          {r?.acties.length ? (
            <ul className="d-wlijst">
              {r.acties.map((a, j) => (
                <li key={j} data-klaar={acties.klaar.includes(j) || undefined}>
                  <Vinkje aan={acties.klaar.includes(j)} onClick={() => acties.wissel(j)} label={`Afvinken: ${a.tekst}`} />
                  <span className="d-vink-tekst">{a.tekst}{a.bron && <span className="meta">{a.bron}</span>}</span>
                  {a.urgent && <span className="rood" title="Dringend" />}
                </li>
              ))}
            </ul>
          ) : (
            <p className="d-leeg">{r ? 'Niets open.' : 'Nog geen ochtendrapport. Dit vult zich zodra /ochtendroutine gedraaid heeft.'}</p>
          )}
        </Tegel>

        <Tegel maat="m" onNaar={onNaar} i={i++}>
          <Kop kleur="var(--blue)" naam="Te doen" rechts="gekozen voor vandaag" />
          {m.taken.gekozen.length ? (
            <ul className="d-wlijst">
              {m.taken.gekozen.map(({ taak, ligt }) => (
                <li key={taak.id}>
                  <Vinkje aan={taak.klaar} onClick={() => onTaakAfvinken(taak, !taak.klaar)} label={`Afvinken: ${taak.tekst}`} />
                  <span className="d-vink-tekst" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {taak.tekst}
                    <span className="meta">{m.taken.cat(taak)}{ligt > 0 ? ` · ligt al ${ligt} ${ligt === 1 ? 'dag' : 'dagen'}` : ''}</span>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="d-leeg">Niets gepland voor vandaag. {m.taken.overig.length} open in de lijst.</p>
          )}
        </Tegel>

        <Tegel maat="s" onNaar={onNaar} naar="taken" i={i++}>
          <Kop kleur="var(--yellow)" naam="Op werk checken" rechts={String(m.opWerk.length)} pijl />
          {m.opWerk.length ? (
            <ul className="d-wlijst">{m.opWerk.map((w, j) => <li key={j} style={{ fontSize: 13 }}>{w.split(':')[0]}</li>)}</ul>
          ) : <p className="d-leeg">Niets te checken.</p>}
        </Tegel>

        <Tegel maat="s" onNaar={onNaar} naar="zaak" i={i++}>
          <Kop kleur="var(--label2)" naam="Dienst" rechts="vandaag" pijl />
          {m.dag.dienst ? (
            <>
              <div className="d-groot">{m.dag.dienst.van}</div>
              <div className="d-onder">tot {m.dag.dienst.tot} · {m.dag.dienst.rol}</div>
              {bv && <div className="d-onder">Verwacht ~{bv.verwacht.gasten} gasten</div>}
            </>
          ) : <p className="d-leeg">Geen dienst vandaag.</p>}
        </Tegel>
      </div>

      <h2 className="d-h2" style={{ marginTop: 30 }}>Persoonlijk</h2>
      <div className="d-raster">
        <Tegel maat="s" onNaar={onNaar} naar="herstel" i={i++}>
          <Kop kleur="var(--orange)" naam="Herstel" rechts="vannacht" pijl />
          {h ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 'auto' }}>
              <Ring waarde={h.readiness ?? 0} r={26} dikte={7} kleur={herstelKleur} tekst={h.readiness ?? '–'} />
              <div>
                <div className="d-onder" style={{ margin: 0 }}>Readiness</div>
                <div style={{ fontWeight: 600 }}>HRV {h.hrv ?? '–'}</div>
                {hrvDelta != null && <div className={`d-onder ${hrvDelta < -15 ? 'd-let' : hrvDelta > 10 ? 'd-goed' : ''}`} style={{ margin: 0 }}>{hrvDelta > 0 ? '+' : ''}{hrvDelta}%</div>}
              </div>
            </div>
          ) : <p className="d-leeg">Nog niet ingevuld. Tik op Oura bovenaan.</p>}
        </Tegel>

        <Tegel maat="s" onNaar={onNaar} naar="herstel" i={i++}>
          <Kop kleur="var(--indigo)" naam="Slaap" rechts={h?.slaapScore != null ? `score ${h.slaapScore}` : undefined} />
          {slaap ? <div className="d-groot">{slaap.u}<small>u</small> {slaap.m}<small>m</small></div> : <p className="d-leeg">Nog niet ingevuld.</p>}
          <Staven waarden={perDag(m.herstel.alle, 14, (x) => x.slaapMinuten).map((p) => p.waarde)} h={30} kleur="var(--indigo)" />
        </Tegel>

        <Tegel maat="s" onNaar={onNaar} naar="lichaam" i={i++}>
          <Kop kleur="var(--purple)" naam="Gewicht" rechts={m.gewicht.nu?.datum === m.vandaag ? 'vanochtend' : m.gewicht.nu ? korteDag(m.gewicht.nu.datum) : undefined} />
          {m.gewicht.nu ? (
            <>
              <div className="d-groot">{komma(m.gewicht.nu.kg)}<small>kg</small></div>
              <div className="d-onder">
                {m.gewicht.week != null ? `week ${komma(m.gewicht.week)}` : 'week: te weinig metingen'}
                {m.gewicht.start != null ? ` · cut ${m.gewicht.nu.kg <= m.gewicht.start ? '−' : '+'}${komma(Math.abs(m.gewicht.start - m.gewicht.nu.kg))}` : ''}
              </div>
            </>
          ) : <p className="d-leeg">Nog geen meting.</p>}
          <Spark waarden={m.gewicht.reeks} h={28} kleur="var(--purple)" />
        </Tegel>

        <Tegel maat="s" onNaar={onNaar} naar="lichaam" i={i++}>
          <Kop kleur="var(--blue)" naam="Schermtijd" rechts="gisteren" />
          {st ? (
            <>
              <div className="d-groot">{st.u}<small>u</small> {st.m}<small>m</small></div>
              {stDelta != null && <div className={`d-onder ${stDelta > 30 ? 'd-let' : stDelta < -30 ? 'd-goed' : ''}`}>{stDelta >= 0 ? '+' : '−'}{Math.abs(stDelta)} min t.o.v. week</div>}
            </>
          ) : <p className="d-leeg">Nog niet ingevuld.</p>}
          <Staven waarden={m.schermtijd.reeks} h={26} kleur="var(--blue)" />
        </Tegel>

        <Tegel maat="m" onNaar={onNaar} naar="training" i={i++}>
          <Kop kleur="var(--green)" naam="Training" rechts={m.dag.rust ? 'vandaag rust' : 'vandaag'} pijl />
          <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-.01em', marginTop: 8 }}>{m.dag.rust ? (m.dag.volgende ?? 'Rust') : m.dag.titel}</div>
          <div className="d-onder">{m.dag.rust ? 'volgende training' : 'staat klaar in de app'}</div>
          {m.training.vorige && (
            <div className="d-leeg" style={{ paddingTop: 10 }}>
              Vorige keer: {m.training.vorige.kop}. {m.training.vorige.tekst[0] ?? ''}
            </div>
          )}
        </Tegel>

        <Tegel maat="m" onNaar={onNaar} naar="brief" i={i++}>
          <Kop kleur="var(--orange)" naam="Ochtendbrief" rechts={m.brief ? korteDag(m.brief.datum) : undefined} pijl />
          {m.rapport?.vandaag && m.rapportVanVandaag ? (
            <p style={{ fontSize: 14, lineHeight: 1.45, margin: '8px 0 0' }}>{m.rapport.vandaag}</p>
          ) : m.herstel.duiding ? (
            <p style={{ fontSize: 14, lineHeight: 1.45, margin: '8px 0 0' }}>{m.herstel.duiding}</p>
          ) : <p className="d-leeg">Nog geen brief vandaag.</p>}
          {m.voorspel && <div className="d-leeg" style={{ paddingTop: 8 }}>Voorspel-agents: {m.voorspel}</div>}
        </Tegel>
      </div>

      <h2 className="d-h2" style={{ marginTop: 30 }}>
        Bregje{r && !m.rapportVanVandaag && <span className="d-label">nog niet ververst</span>}
      </h2>
      <div className="d-raster">
        <Tegel maat="m" onNaar={onNaar} naar="omzet" i={i++}>
          <Kop kleur="var(--teal)" naam={bg && bg.datum < m.vandaag ? 'Omzet gisteren' : 'Omzet'} rechts={bg ? korteDag(bg.datum) : undefined} pijl />
          {bg ? (
            <div style={{ display: 'flex', gap: 16, alignItems: 'flex-end', marginTop: 'auto' }}>
              <div style={{ minWidth: 0 }}>
                <div className="d-groot">{eur(bg.gembes, 2)}</div>
                {bg.gemWeekdag != null && (
                  <div className="d-onder">gembes · <b className={bg.gembes >= bg.gemWeekdag ? 'd-goed' : 'd-let'}>{bg.gembes >= bg.gemWeekdag ? '+' : '−'}{eur(Math.abs(bg.gembes - bg.gemWeekdag), 2)}</b> t.o.v. gem.</div>
                )}
                <div className="d-onder">
                  {komma(bg.couverts)} couverts · {eur(bg.omzet)}
                  {bg.loon && <> · loon <b className={bg.loon.pct > bg.loon.doelPct ? 'd-let' : 'd-goed'}>{komma(bg.loon.pct)}%</b></>}
                </div>
              </div>
              <div style={{ flex: 1, minWidth: 70 }}><Staven waarden={bg.gembesReeks.map((x) => x.gembes)} h={58} kleur="var(--teal)" /></div>
            </div>
          ) : <p className="d-leeg">Nog geen omzet binnen.</p>}
        </Tegel>

        <Tegel maat="m" onNaar={onNaar} naar="zaak" i={i++}>
          <Kop kleur="var(--teal)" naam="Bezetting vandaag" rechts={bv?.reservering ? `${bv.reservering.gasten} gereserveerd` : undefined} pijl />
          {bv?.voorstel ? (
            <>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 6, flexWrap: 'wrap' }}>
                <span className="d-groot" style={{ margin: 0 }}>{bv.voorstel.pct != null ? komma(bv.voorstel.pct) : '–'}<small>%</small></span>
                <span className="d-onder" style={{ margin: 0 }}>voorstel {eur(bv.voorstel.kosten)} · budget {eur(bv.verwacht.budget)}</span>
              </div>
              <div style={{ marginTop: 8 }}><Balk pct={((bv.voorstel.pct ?? 0) / 40) * 100} kleur="var(--orange)" doel={(27 / 40) * 100} /></div>
              <div className="d-gantt">
                {bv.voorstel.mensen.map((p) => (
                  <div key={p.naam}><span>{p.naam}</span><s><i style={{ ...gantt(p.van, p.tot ?? sluitVan(p.afdeling)), background: p.afdeling === 'keuken' ? 'var(--orange)' : 'var(--teal)' }} /></s></div>
                ))}
              </div>
            </>
          ) : bv ? (
            <><div className="d-groot">~{bv.verwacht.gasten}<small>gasten</small></div><p className="d-leeg">Nog geen voorstel vastgelegd. Budget {eur(bv.verwacht.budget)}.</p></>
          ) : <p className="d-leeg">Nog geen bezetting.</p>}
        </Tegel>

        <Tegel maat="s" onNaar={onNaar} naar="mail" i={i++}>
          <Kop kleur="var(--blue)" naam="Mail" rechts={r?.mail ? `${r.mail.nieuw} nieuw` : undefined} pijl />
          {r?.mail ? (
            <><div className="d-groot">{r.mail.concepten}</div><div className="d-onder">concepten klaar</div><div className="d-onder">{r.mail.threads} threads in de inbox</div></>
          ) : <p className="d-leeg">Nog geen mailrapport.</p>}
        </Tegel>

        <Tegel maat="s" onNaar={onNaar} naar="meppie" i={i++}>
          <Kop kleur="var(--mint)" naam="Meppie" pijl />
          {r?.meppie?.length ? (
            <div className="d-rijtjes">
              {r.meppie.map((x) => (
                <div key={x.label}><span><span className="d-dot" style={{ background: x.ok ? 'var(--green)' : 'var(--orange)' }} />{x.label.replace('Schoonmaak ', '')}</span><b>{x.waarde}</b></div>
              ))}
            </div>
          ) : <p className="d-leeg">Nog geen registraties gemeld.</p>}
        </Tegel>

        <Tegel maat="m" onNaar={onNaar} naar="mail" i={i++}>
          <Kop kleur="var(--pink)" naam="Guestplan vandaag" rechts={r?.dag ? `${r.dag.reserveringen} res · ${r.dag.gasten} gasten` : undefined} pijl />
          {r?.dag ? (
            <>
              <div className="d-onder" style={{ marginTop: 6 }}>
                {r.dag.groepen.length ? r.dag.groepen.map((g) => `${g.naam} ${g.aantal} p ${g.tijd}`).join(' · ') : 'Geen groepen ≥ 12'} · {r.dag.allergieen.length ? r.dag.allergieen.join(', ') : 'geen allergieën'}
              </div>
              <div className="d-chips2">{r.dag.wensen.map((w) => <span key={w}>{w}</span>)}</div>
              {!!r.guestplan?.length && <div className="d-onder" style={{ marginTop: 'auto', paddingTop: 8 }}>Ingevoerd: {r.guestplan.map((g) => `${g.naam} (${g.actie})`).join(', ')}</div>}
            </>
          ) : <p className="d-leeg">Nog geen Guestplan-dag.</p>}
        </Tegel>
      </div>

      <h2 className="d-h2" style={{ marginTop: 30 }}>Deze week</h2>
      <div className="d-raster">
        <Tegel maat="m" onNaar={onNaar} naar="geld" i={i++}>
          <Kop kleur="var(--green)" naam="Geld" rechts={m.geld.laatste ? `week van ${korteDag(m.geld.laatste.datum)}` : undefined} pijl />
          {m.geld.laatste ? (
            <div style={{ display: 'flex', gap: 16, alignItems: 'flex-end', marginTop: 'auto' }}>
              <div style={{ minWidth: 0 }}>
                <div className="d-groot">{eur(m.geld.laatste.uit)}</div>
                <div className="d-onder">uit{m.geld.gem != null ? ` · gem. week ${eur(m.geld.gem)}` : ''}</div>
              </div>
              <div style={{ flex: 1, minWidth: 70 }}><Staven waarden={m.geld.weken.slice(-6).map((w) => w.uit)} h={52} kleur="var(--green)" /></div>
            </div>
          ) : <p className="d-leeg">Nog geen afschrift verwerkt.</p>}
        </Tegel>
        <Tegel maat="m" onNaar={onNaar} naar="omzet" i={i++}>
          <Kop kleur="var(--teal)" naam="Omzet 14 dagen" rechts={bg ? `t/m ${korteDag(bg.datum)}` : undefined} pijl />
          {bg ? (
            <>
              <div className="d-groot">{eur(bg.omzetReeks.reduce((a, x) => a + x.omzet, 0))}</div>
              <div className="d-onder">samen, incl. btw</div>
              <Spark waarden={bg.omzetReeks.map((x) => x.omzet)} h={36} kleur="var(--teal)" />
            </>
          ) : <p className="d-leeg">Nog geen omzet binnen.</p>}
        </Tegel>
      </div>
    </div>
  )
}
