import { useState, type ReactNode } from 'react'
import type { Herstel, Taak } from '../types'
import { Balk, Ic, Pijl, Spark, Staven, Vinkje } from './teken'
import { eur, gem14, komma, korteDag, perDag, uurMin, type Model } from './model'
import { TijdGrafiek } from './TijdGrafiek'
import { TrainingPagina } from './TrainingPagina'
import { GewichtPagina, SchermtijdPagina } from './LichaamPaginas'
import { TakenPagina } from './TakenPagina'
import { NAV, type Pagina } from './Schil'
import { useActiesKlaar, type Invul } from './Overzicht'

// ── Bouwstenen ──
function Kop({ titel, sub }: { titel: string; sub?: ReactNode }) {
  return (<><h1 className="d-h1">{titel}</h1>{sub ? <p className="d-sub">{sub}</p> : <div style={{ height: 18 }} />}</>)
}
const H2 = ({ children }: { children: ReactNode }) => <h2 className="d-h2">{children}</h2>
const Lijst = ({ children }: { children: ReactNode }) => <div className="d-lijst">{children}</div>
function Rij({ l, s, w, wc = '', ic, onClick, klaar, vink }: {
  l: ReactNode; s?: ReactNode; w?: ReactNode; wc?: string; ic?: ReactNode; onClick?: () => void; klaar?: boolean; vink?: () => void
}) {
  const inhoud = (
    <>
      {vink && <Vinkje aan={!!klaar} onClick={vink} label="Afvinken" />}
      {ic}
      <span className="tekst"><span className={vink ? 'd-vink-tekst' : ''}>{l}</span>{s != null && <small>{s}</small>}</span>
      {w != null && <span className={`waarde ${wc}`}>{w}</span>}
      {onClick && <span className="chev"><Pijl /></span>}
    </>
  )
  const cls = `d-rij ${ic ? 'met-ic' : ''}`
  return onClick
    ? <button type="button" className={cls} onClick={onClick}>{inhoud}</button>
    : <div className={cls} data-klaar={klaar || undefined}>{inhoud}</div>
}
const Leeg = ({ children }: { children: ReactNode }) => <Lijst><Rij l={<span className="d-mut">{children}</span>} /></Lijst>
const hm = (min: number) => { const x = uurMin(min); return `${x.u}u${x.m}` }

export interface PaginaProps {
  m: Model
  onNaar: (p: Pagina) => void
  onInvul: (i: Invul) => void
  onTaakAfvinken: (t: Taak, klaar: boolean) => void
  onTaakToevoegen: (tekst: string) => void
  /** Hele taak opslaan (bewerken, plannen, subtaken, verwijderen). */
  onTaakBewaar: (t: Taak) => void
  onNotitie: () => void
}

// ── Persoonlijk ──
type Metriek = 'hrv' | 'readiness' | 'slaap' | 'rhr'
const METRIEK: Record<Metriek, { label: string; kleur: string; waarde: (h: Herstel) => number | null; fmt: (n: number) => string; soort?: 'staaf' }> = {
  hrv: { label: 'HRV', kleur: 'var(--orange)', waarde: (h) => h.hrv, fmt: (n) => `${Math.round(n)} ms` },
  readiness: { label: 'Readiness', kleur: 'var(--green)', waarde: (h) => h.readiness, fmt: (n) => `${Math.round(n)}` },
  slaap: { label: 'Slaap', kleur: 'var(--indigo)', waarde: (h) => h.slaapMinuten, fmt: (n) => hm(n), soort: 'staaf' },
  rhr: { label: 'Rusthartslag', kleur: 'var(--red)', waarde: (h) => h.rusthartslag, fmt: (n) => `${Math.round(n)} bpm` },
}
const SLAAPSCORE = [[85, 'uitstekend'], [75, 'goed'], [70, 'redelijk'], [60, 'matig'], [0, 'slecht']] as const

/** Afwijking t.o.v. je gemiddelde, met de drempels van de brief (Daily-app oura.py). */
function afwijking(k: 'hrv' | 'rhr' | 'slaap', v: number | null, g: number | null) {
  if (v == null || g == null) return null
  if (k === 'hrv') {
    const pct = Math.round(((v - g) / g) * 100)
    return { tekst: `${pct >= 0 ? '↑' : '↓'} ${Math.abs(pct)}%`, kleur: pct < -10 ? 'd-let' : pct > 10 ? 'd-goed' : '', signaal: pct < -10 ? `HRV ${Math.abs(pct)}% lager` : null }
  }
  if (k === 'rhr') {
    const d = Math.round(v - g)
    return { tekst: `${d >= 0 ? '↑' : '↓'} ${Math.abs(d)}`, kleur: d > 5 ? 'd-let' : d < -3 ? 'd-goed' : '', signaal: d > 5 ? `rusthartslag +${d}` : null }
  }
  const d = Math.round(v - g)
  return { tekst: `${d >= 0 ? '↑' : '↓'} ${Math.abs(d)} min`, kleur: d < -60 ? 'd-let' : '', signaal: d < -60 ? `${Math.abs(d)} min korter geslapen` : null }
}

function HerstelPagina({ m, onInvul }: PaginaProps) {
  const [metriek, setMetriek] = useState<Metriek>('hrv')
  const [dagen, setDagen] = useState<14 | 90>(14)
  const h = m.herstel.vandaag
  const alle = m.herstel.alle
  const def = METRIEK[metriek]
  const punten = perDag(alle, dagen, def.waarde)
  const ingevuld = punten.filter((p) => p.waarde != null).length
  const g = {
    hrv: gem14(alle, (x) => x.hrv), rhr: gem14(alle, (x) => x.rusthartslag), slaap: gem14(alle, (x) => x.slaapMinuten),
    readiness: gem14(alle, (x) => x.readiness),
  }
  const gemMetriek = metriek === 'rhr' ? g.rhr : g[metriek]
  const af = { hrv: afwijking('hrv', h?.hrv ?? null, g.hrv), rhr: afwijking('rhr', h?.rusthartslag ?? null, g.rhr), slaap: afwijking('slaap', h?.slaapMinuten ?? null, g.slaap) }
  const signalen = [
    af.hrv?.signaal, af.rhr?.signaal, af.slaap?.signaal,
    h?.readiness != null && h.readiness < 70 ? `readiness ${h.readiness}` : null,
    h?.tempAfwijking != null && h.tempAfwijking > 0.5 ? `temperatuur +${komma(h.tempAfwijking)}°` : null,
  ].filter((x): x is string => !!x)
  const band = h?.slaapScore != null ? SLAAPSCORE.find(([grens]) => h.slaapScore! >= grens)?.[1] : null
  const vandaagWaarde = h ? def.waarde(h) : null

  return (
    <div className="d-pagina smal">
      <Kop titel="Herstel" sub={h ? `Vannacht · ingevuld om ${h.bijgewerkt?.slice(11, 16) ?? '?'}` : 'Nog niets ingevuld voor vannacht'} />

      {(m.herstel.duiding || signalen.length > 0) && (
        <section className="d-duiding">
          <div className="d-duiding-kop">Wat zegt het</div>
          {m.herstel.duiding && <p>{m.herstel.duiding}</p>}
          {signalen.length > 0 ? (
            <div className="d-signalen">{signalen.map((x) => <span key={x}>{x}</span>)}</div>
          ) : h ? <div className="d-signalen"><span className="rustig">geen afwijkingen</span></div> : null}
        </section>
      )}

      <div className="d-lijst d-grafiek" style={{ marginTop: 20 }}>
        <div className="d-seg" role="tablist" aria-label="Wat je ziet">
          {(Object.keys(METRIEK) as Metriek[]).map((k) => (
            <button key={k} type="button" role="tab" aria-selected={metriek === k} onClick={() => setMetriek(k)}>{METRIEK[k].label}</button>
          ))}
        </div>
        <div className="kop" style={{ marginTop: 14 }}>
          <b className="d-num" style={{ color: def.kleur }}>{vandaagWaarde != null ? def.fmt(vandaagWaarde) : '–'}<small>vannacht</small></b>
          <span>{gemMetriek != null ? `gem. 14 dagen ${def.fmt(gemMetriek)}` : ''}</span>
        </div>
        <TijdGrafiek punten={punten} kleur={def.kleur} gem={gemMetriek} formatteer={def.fmt} soort={def.soort} />
        <div className="d-grafiek-voet">
          <span>{ingevuld} van {dagen} dagen ingevuld</span>
          <div className="d-seg klein" role="tablist" aria-label="Periode">
            <button type="button" role="tab" aria-selected={dagen === 14} onClick={() => setDagen(14)}>2 weken</button>
            <button type="button" role="tab" aria-selected={dagen === 90} onClick={() => setDagen(90)}>3 maanden</button>
          </div>
        </div>
      </div>
      <p className="d-voetnoot">Gestippeld = je gemiddelde van de 14 dagen ervoor (zelfde maatstaf als de brief).{def.soort ? '' : ' Brede lijn = 7-daags gemiddelde.'} Tik of beweeg over de grafiek voor een dag.</p>

      <H2>Vannacht</H2>
      {h ? (
        <Lijst>
          <Rij l="Readiness" s={g.readiness != null ? `gem. ${Math.round(g.readiness)}` : undefined} w={h.readiness ?? '–'} wc={h.readiness != null && h.readiness < 70 ? 'd-let' : ''} />
          <Rij l="Slaap" s={g.slaap != null ? `gem. ${hm(g.slaap)}${af.slaap ? ` · ${af.slaap.tekst}` : ''}` : undefined} w={h.slaapMinuten != null ? hm(h.slaapMinuten) : '–'} wc={af.slaap?.kleur} />
          <Rij l="Slaapscore" s={band ?? undefined} w={h.slaapScore ?? '–'} />
          <Rij l="HRV" s={g.hrv != null ? `gem. ${komma(g.hrv)}${af.hrv ? ` · ${af.hrv.tekst}` : ''}` : undefined} w={h.hrv != null ? `${h.hrv} ms` : '–'} wc={af.hrv?.kleur} />
          <Rij l="Rusthartslag" s={g.rhr != null ? `gem. ${komma(g.rhr)}${af.rhr ? ` · ${af.rhr.tekst}` : ''}` : undefined} w={h.rusthartslag != null ? `${h.rusthartslag} bpm` : '–'} wc={af.rhr?.kleur} />
          <Rij l="Temperatuur" s="afwijking van normaal" w={h.tempAfwijking != null ? `${h.tempAfwijking > 0 ? '+' : ''}${komma(h.tempAfwijking)}°` : '–'} wc={h.tempAfwijking != null && h.tempAfwijking > 0.5 ? 'd-slecht' : ''} />
        </Lijst>
      ) : <Leeg>Neem de cijfers over uit de Oura-app.</Leeg>}
      <p className="d-voetnoot">Oranje = de brief noemt het een signaal: HRV meer dan 10% lager, rusthartslag meer dan 5 hoger, meer dan een uur korter geslapen, readiness onder 70. Rood = temperatuur meer dan 0,5° hoger.</p>
      <div className="d-knoppen"><button type="button" className="d-knop" onClick={() => onInvul('herstel')}>{h ? 'Cijfers aanpassen' : 'Cijfers invullen'}</button></div>
    </div>
  )
}

// ── Bregje ──
function NietVers({ m }: { m: Model }) {
  if (!m.rapport || m.rapportVanVandaag) return null
  return <p className="d-voetnoot" style={{ margin: '-12px 0 18px' }}>Rapport van {korteDag(m.rapport.datum)}: de ochtendroutine heeft vandaag nog niet gedraaid.</p>
}

function Zaak({ m }: PaginaProps) {
  const bv = m.bregje?.vandaag
  const r = m.rapport
  const per = (afd: string) => bv?.voorstel?.mensen.filter((p) => p.afdeling === afd) ?? []
  const sluit = (afd: string) => (afd === 'keuken' ? bv?.sluit.keuken : bv?.sluit.bediening)
  return (
    <div className="d-pagina">
      <Kop titel="Vandaag in de zaak" sub={bv ? `${bv.reservering ? `${bv.reservering.aantal ?? '?'} reserveringen · ${bv.reservering.gasten} gasten · ` : ''}verwacht ~${bv.verwacht.gasten}` : 'Nog geen gegevens'} />
      <NietVers m={m} />
      {bv && (
        <div className="d-lijst d-grafiek">
          <div className="kop"><b className="d-num">{bv.voorstel?.pct != null ? komma(bv.voorstel.pct) : '–'}<small>% loon in het voorstel</small></b><span>{bv.voorstel ? `${eur(bv.voorstel.kosten)} · ` : ''}budget {eur(bv.verwacht.budget)}</span></div>
          <Balk pct={((bv.voorstel?.pct ?? 0) / 40) * 100} kleur="var(--orange)" doel={(27 / 40) * 100} />
          <p className="d-voetnoot" style={{ margin: '10px 0 0' }}>Verwachte sluit: keuken {bv.sluit.keuken ?? '?'}, bediening {bv.sluit.bediening ?? '?'}. {bv.verwacht.uitleg}.</p>
        </div>
      )}
      {bv?.voorstel ? (
        <div className="d-twee">
          {(['keuken', 'bediening'] as const).map((afd) => (
            <div key={afd}><H2>{afd === 'keuken' ? 'Keuken' : 'Voorkant'}</H2>
              <Lijst>{per(afd).map((p) => <Rij key={p.naam} l={p.naam} s={`${komma(p.uren)} u · ${eur(p.kosten)}`} w={`${p.van}–${p.tot ?? `sluit (~${sluit(afd) ?? '?'})`}`} />)}</Lijst>
            </div>
          ))}
        </div>
      ) : bv ? <><H2>Voorstel</H2><Leeg>Nog niet vastgelegd.</Leeg></> : null}
      {r?.bezettingNoot && <p className="d-voetnoot">{r.bezettingNoot}</p>}
      <H2>Bijzonderheden</H2>
      {r?.dag ? (
        <Lijst>
          <Rij l={r.dag.groepen.length ? r.dag.groepen.map((g) => `${g.naam}: ${g.aantal} p om ${g.tijd}${g.menu ? '' : ' (menu ontbreekt)'}`).join(' · ') : 'Geen groepen ≥ 12'} />
          <Rij l={r.dag.allergieen.length ? r.dag.allergieen.join(' · ') : 'Geen allergieën'} />
          {r.dag.wensen.map((w) => { const [wie, ...wat] = w.split(':'); return <Rij key={w} l={wie} s={wat.join(':').trim() || undefined} /> })}
          {r.dag.menus.map((x) => <Rij key={x} l={x} w="PDF klaar" wc="d-goed" />)}
        </Lijst>
      ) : <Leeg>Nog geen Guestplan-dag.</Leeg>}
    </div>
  )
}

function Omzet({ m }: PaginaProps) {
  const g = m.bregje?.gisteren
  if (!g) return <div className="d-pagina smal"><Kop titel="Omzet" sub="Nog geen kassarapport verwerkt" /></div>
  return (
    <div className="d-pagina">
      <Kop titel="Omzet" sub={`${korteDag(g.datum)}${g.besteVan ? ` · beste van de laatste ${g.besteVan}` : ''}`} />
      <div className="d-twee">
        <div>
          <div className="d-lijst d-grafiek">
            <div className="kop"><b className="d-num">{eur(g.gembes, 2)}<small>gembes</small></b><span>{g.gemWeekdag != null ? `gem. ${eur(g.gemWeekdag, 2)}` : ''}</span></div>
            <Staven waarden={g.gembesReeks.map((x) => x.gembes)} h={90} kleur="var(--teal)" />
          </div>
          <p className="d-voetnoot">Dezelfde weekdag, laatste {g.gembesReeks.length} keer; rechts de laatste.</p>
        </div>
        <div>
          <div className="d-lijst d-grafiek">
            <div className="kop"><b className="d-num">{eur(g.omzet)}<small>omzet</small></b><span>14 dagen</span></div>
            <Spark waarden={g.omzetReeks.map((x) => x.omzet)} h={90} kleur="var(--teal)" />
          </div>
        </div>
      </div>
      <H2>De dag</H2>
      <Lijst>
        <Rij l="Couverts" w={komma(g.couverts)} />
        <Rij l="Omzet" w={eur(g.omzet, 2)} s={`${eur(g.omzetEx, 2)} zonder btw`} />
        {g.loon && <Rij l="Loon" w={`${eur(g.loon.kosten, 2)} · ${komma(g.loon.pct)}%`} wc={g.loon.pct > g.loon.doelPct ? 'd-let' : 'd-goed'} s={`doel ${g.loon.doelPct}% = ${eur(g.loon.budget)} · ${g.loon.mensen} mensen, ${komma(g.loon.uren)} uur`} />}
      </Lijst>
      {!!g.diensten.length && (<><H2>Diensten</H2><Lijst>{g.diensten.map((d) => <Rij key={d.naam + d.van} l={d.naam} w={`${d.van}–${d.tot} · ${eur(d.kosten)}`} />)}</Lijst></>)}
      <H2>Dagrapport</H2>
      <Lijst>{g.regels.map((x, j) => <Rij key={j} l={<span style={{ fontSize: 14 }}>{x.trim()}</span>} />)}</Lijst>
    </div>
  )
}

function Mail({ m }: PaginaProps) {
  const r = m.rapport
  return (
    <div className="d-pagina">
      <Kop titel="Mail & Guestplan" sub={r?.mail ? `${r.mail.threads} threads · ${r.mail.nieuw} nieuw · ${r.mail.concepten} concepten klaar` : 'Nog geen mailrapport'} />
      <NietVers m={m} />
      {r?.mail && (<><H2>Inbox</H2><Lijst>{r.mail.regels.map((x, j) => <Rij key={j} l={x.wie} s={x.wat} w={x.concept ? 'Concept klaar' : 'Gemeld'} wc={x.concept ? 'd-goed' : ''} />)}</Lijst></>)}
      <H2>In Guestplan gezet</H2>
      {r?.guestplan?.length ? (
        <Lijst>{r.guestplan.map((g, j) => (
          <Rij key={j} l={g.naam} s={`${korteDag(g.datum)} · ${g.tijd} · ${g.aantal} p${g.tafel ? ` · tafel ${g.tafel}` : ''}${g.was ? ` · was ${g.was}` : ''}${g.opmerking ? ` · ${g.opmerking}` : ''}`} w={g.actie} wc={g.actie === 'nieuw' ? 'd-goed' : 'd-let'} />
        ))}</Lijst>
      ) : <Leeg>Niets ingevoerd.</Leeg>}
      {!!r?.wachtOp?.length && (<><H2>Wacht nog op</H2><Lijst>{r.wachtOp.map((x) => <Rij key={x} l={x} />)}</Lijst></>)}
      {!!r?.nietIngevoerd?.length && (<><H2>Niet ingevoerd</H2><Lijst>{r.nietIngevoerd.map((x) => <Rij key={x} l={x} />)}</Lijst></>)}
      {!!r?.komend?.length && (<><H2>Komende groepen</H2><Lijst>{r.komend.map((k, j) => <Rij key={j} l={k.naam} s={`${korteDag(k.datum)}${k.noot ? ` · ${k.noot}` : ''}`} w={k.menu ? 'PDF klaar' : 'Menu volgt'} wc={k.menu ? 'd-goed' : 'd-let'} />)}</Lijst></>)}
    </div>
  )
}

function Meppie({ m }: PaginaProps) {
  const r = m.rapport
  return (
    <div className="d-pagina smal">
      <Kop titel="Meppie" sub="Registraties uit de ochtendroutine" />
      <NietVers m={m} />
      {r?.meppie?.length ? <Lijst>{r.meppie.map((x) => <Rij key={x.label} l={x.label} w={x.waarde} wc={x.ok ? 'd-goed' : 'd-let'} />)}</Lijst> : <Leeg>Nog niets gemeld.</Leeg>}
      <p className="d-voetnoot">Terugkoelen wordt één keer per week echt gemeten. Lever de waardes aan, dan vul ik ze in.</p>
    </div>
  )
}

// ── Week ──
function Geld({ m }: PaginaProps) {
  const l = m.geld.laatste
  return (
    <div className="d-pagina smal">
      <Kop titel="Geld & uren" sub={l ? `Week van ${korteDag(l.datum)} · uit het ABN-afschrift` : 'Nog geen afschrift verwerkt'} />
      {l && (
        <div className="d-lijst d-grafiek">
          <div className="kop"><b className="d-num">{eur(l.uit)}<small>uit</small></b><span>{m.geld.gem != null ? `gem. week ${eur(m.geld.gem)}` : ''}</span></div>
          <Staven waarden={m.geld.weken.slice(-12).map((w) => w.uit)} h={90} kleur="var(--green)" />
        </div>
      )}
      {l && <p className="d-voetnoot">Laatste 12 weken. Ingekomen in de laatste week: {eur(l.in)}.</p>}
      <H2>Weekreflectie</H2>
      {m.geld.tekst ? <div className="d-tekstblok">{m.geld.tekst.trim()}</div> : <Leeg>Komt op maandag, met het nieuwe afschrift.</Leeg>}
      <H2>Uren</H2>
      {m.geld.uren ? <div className="d-tekstblok">{m.geld.uren.trim()}</div> : <Leeg>Komt op maandag, met je urenrapport.</Leeg>}
    </div>
  )
}

function Brief({ m }: PaginaProps) {
  const b = m.brief
  return (
    <div className="d-pagina smal">
      <Kop titel="Ochtendbrief" sub={b ? `${korteDag(b.datum)} · gemaakt om ${b.gegenereerd_op.slice(11, 16)}` : 'Nog geen brief'} />
      {m.rapport?.status && m.rapportVanVandaag && (
        <><H2>Ochtendroutine</H2><Lijst>{m.rapport.status.map((s) => <Rij key={s.onderdeel} l={s.onderdeel} s={s.reden} w={s.stand} wc={s.stand === 'gelukt' ? 'd-goed' : s.stand === 'deels' ? 'd-let' : 'd-slecht'} />)}</Lijst></>
      )}
      {b?.secties.map((s) => (
        <div key={s.id}><H2>{s.titel}</H2><div className="d-tekstblok">{s.tekst.trim()}</div></div>
      ))}
    </div>
  )
}

function Meer({ onNaar, m }: PaginaProps) {
  const r = m.rapport
  const acties = useActiesKlaar(r?.datum)
  return (
    <div className="d-pagina smal">
      <Kop titel="Meer" />
      <Lijst>{NAV.filter((n) => !['overzicht', 'logboek', 'taken'].includes(n.p)).map((n) => (
        <Rij key={n.p} ic={<Ic g={n.g} kleur={n.kleur} />} l={n.naam} onClick={() => onNaar(n.p)} />
      ))}</Lijst>
      <div style={{ height: 20 }} />
      <Lijst><Rij ic={<Ic g="tandwiel" kleur="#8e8e93" />} l="Instellingen" onClick={() => onNaar('instellingen')} /></Lijst>
      {r && <p className="d-voetnoot">{r.acties.length - acties.klaar.length} acties open in het ochtendrapport.</p>}
    </div>
  )
}

export const PAGINAS: Partial<Record<Pagina, (p: PaginaProps) => ReactNode>> = {
  herstel: HerstelPagina, training: TrainingPagina, gewicht: GewichtPagina, schermtijd: SchermtijdPagina, taken: TakenPagina,
  zaak: Zaak, omzet: Omzet, mail: Mail, meppie: Meppie, geld: Geld, brief: Brief, meer: Meer,
}
