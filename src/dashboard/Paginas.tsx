import { useState, type ReactNode } from 'react'
import type { Taak } from '../types'
import { Balk, Ic, Pijl, Spark, Staven, Vinkje } from './teken'
import { eur, komma, korteDag, parseTraining, uurMin, type Model } from './model'
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
  onNotitie: () => void
}

// ── Persoonlijk ──
function Herstel({ m, onInvul }: PaginaProps) {
  const h = m.herstel.vandaag
  return (
    <div className="d-pagina smal">
      <Kop titel="Herstel" sub={h ? 'Vannacht, overgenomen uit Oura' : 'Nog niets ingevuld voor vannacht'} />
      <div className="d-lijst d-grafiek">
        <div className="kop"><b className="d-num">{h?.hrv ?? '–'}<small>ms HRV</small></b><span>{m.herstel.hrvGem != null ? `gem. ${komma(m.herstel.hrvGem)}` : ''}</span></div>
        <Spark waarden={m.herstel.reeks.map((x) => x.hrv ?? 0)} h={90} kleur="var(--orange)" />
      </div>
      {m.herstel.duiding && <p className="d-voetnoot">{m.herstel.duiding}</p>}
      <H2>Vannacht</H2>
      {h ? (
        <Lijst>
          <Rij l="Readiness" w={h.readiness ?? '–'} />
          <Rij l="Slaap" w={h.slaapMinuten != null ? hm(h.slaapMinuten) : '–'} />
          <Rij l="Slaapscore" w={h.slaapScore ?? '–'} />
          <Rij l="HRV" w={h.hrv != null ? `${h.hrv} ms` : '–'} />
          <Rij l="Rusthartslag" w={h.rusthartslag != null ? `${h.rusthartslag} bpm` : '–'} s={m.herstel.rhrGem != null ? `gemiddeld ${komma(m.herstel.rhrGem)}` : undefined} />
          <Rij l="Temperatuur" w={h.tempAfwijking != null ? `${h.tempAfwijking > 0 ? '+' : ''}${komma(h.tempAfwijking)}°` : '–'} />
        </Lijst>
      ) : <Leeg>Neem de cijfers over uit de Oura-app.</Leeg>}
      <div className="d-knoppen"><button type="button" className="d-knop" onClick={() => onInvul('herstel')}>{h ? 'Cijfers aanpassen' : 'Cijfers invullen'}</button></div>
    </div>
  )
}

function Training({ m, onNaar, onNotitie }: PaginaProps) {
  const t = m.training.tekst ? parseTraining(m.training.tekst) : null
  return (
    <div className="d-pagina smal">
      <Kop titel={t?.titel ? t.titel.split('—')[0].trim().toLowerCase().replace(/^./, (c) => c.toUpperCase()) : 'Training'}
        sub={t ? t.titel?.split('—')[1]?.trim() : m.dag.rust ? `Vandaag rust · volgende: ${m.dag.volgende ?? 'onbekend'}` : 'Nog geen training in de brief'} />
      {t ? (
        <>
          {!!t.algemeen.length && <Lijst>{t.algemeen.map((a, j) => <Rij key={j} l={<span style={{ fontSize: 14 }}>{a}</span>} />)}</Lijst>}
          {t.oefeningen.map((o) => (
            <div key={o.naam}>
              <H2>{o.naam}</H2>
              <div className="d-lijst">
                <div className="d-sets" style={{ paddingTop: 14 }}>{o.sets.map((s, j) => <span key={j}>{s}</span>)}</div>
                {!!o.noten.length && <ul className="d-noten">{o.noten.map((n, j) => <li key={j}>{n}</li>)}</ul>}
              </div>
            </div>
          ))}
        </>
      ) : null}
      <H2>Vorige keer</H2>
      {m.training.vorige ? (
        <Lijst><Rij l={m.training.vorige.kop} s={m.training.vorige.tekst.join(' ')} /></Lijst>
      ) : <Leeg>Geen notitie gevonden.</Leeg>}
      <div className="d-knoppen">
        <button type="button" className="d-knop" onClick={onNotitie}>Notitie schrijven</button>
        <button type="button" className="d-knop zacht" onClick={() => onNaar('logboek')}>Naar het logboek</button>
      </div>
    </div>
  )
}

function Lichaam({ m, onInvul }: PaginaProps) {
  const g = m.gewicht
  return (
    <div className="d-pagina">
      <Kop titel="Gewicht & schermtijd" sub="Vanochtend en gisteren" />
      <div className="d-twee">
        <div>
          <H2>Gewicht</H2>
          <div className="d-lijst d-grafiek">
            <div className="kop"><b className="d-num">{g.nu ? komma(g.nu.kg) : '–'}<small>kg</small></b><span>{g.week != null ? `week ${komma(g.week)}` : ''}{g.vorigeWeek != null ? ` · vorige ${komma(g.vorigeWeek)}` : ''}</span></div>
            <Spark waarden={g.reeks} h={80} kleur="var(--purple)" />
          </div>
          {g.start != null && g.nu && <p className="d-voetnoot">Sinds de start van de cut (29 sep): {komma(g.start)} → {komma(g.nu.kg)} kg.</p>}
          <div className="d-knoppen"><button type="button" className="d-knop" onClick={() => onInvul('gewicht')}>Gewicht invullen</button></div>
        </div>
        <div>
          <H2>Schermtijd</H2>
          <div className="d-lijst d-grafiek">
            <div className="kop"><b className="d-num">{m.schermtijd.netto != null ? hm(m.schermtijd.netto) : '–'}<small>netto</small></b><span>{m.schermtijd.week != null ? `week ${hm(m.schermtijd.week)}` : ''}</span></div>
            <Staven waarden={m.schermtijd.reeks} h={80} kleur="var(--blue)" />
          </div>
          {m.schermtijd.bruto != null && m.schermtijd.netto != null && <p className="d-voetnoot">Van {hm(m.schermtijd.bruto)} bruto, {hm(m.schermtijd.bruto - m.schermtijd.netto)} eraf (Flitsmeister).</p>}
          <div className="d-knoppen"><button type="button" className="d-knop" onClick={() => onInvul('schermtijd')}>Schermtijd invullen</button></div>
        </div>
      </div>
    </div>
  )
}

function Taken({ m, onTaakAfvinken, onTaakToevoegen }: PaginaProps) {
  const [nieuw, setNieuw] = useState('')
  const voegToe = () => { const t = nieuw.trim(); if (t) { onTaakToevoegen(t); setNieuw('') } }
  return (
    <div className="d-pagina smal">
      <Kop titel="Taken" sub="Ik kies er elke ochtend 1 tot 3 voor vandaag" />
      <Lijst>
        <div className="d-rij">
          <input className="d-invoer" id="nieuwe-taak" value={nieuw} placeholder="Wat schiet je te binnen?" onChange={(e) => setNieuw(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && voegToe()} />
          {nieuw.trim() && <button type="button" className="d-knop" style={{ height: 32 }} onClick={voegToe}>Voeg toe</button>}
        </div>
      </Lijst>
      <H2>Voor vandaag</H2>
      {m.taken.gekozen.length ? (
        <Lijst>{m.taken.gekozen.map(({ taak, v, ligt }) => (
          <Rij key={taak.id} vink={() => onTaakAfvinken(taak, !taak.klaar)} klaar={taak.klaar} l={taak.tekst}
            s={[m.taken.cat(taak), v?.toelichting].filter(Boolean).join(' · ')} w={ligt > 0 ? `${ligt} d` : undefined} wc={ligt >= 5 ? 'd-slecht' : ligt >= 2 ? 'd-let' : ''} />
        ))}</Lijst>
      ) : <Leeg>Niets gepland voor vandaag.</Leeg>}
      <H2>Verder open</H2>
      {m.taken.overig.length ? (
        <Lijst>{m.taken.overig.map(({ taak, v }) => (
          <Rij key={taak.id} vink={() => onTaakAfvinken(taak, !taak.klaar)} klaar={taak.klaar} l={taak.tekst} s={[m.taken.cat(taak), v?.toelichting].filter(Boolean).join(' · ')} />
        ))}</Lijst>
      ) : <Leeg>Niets anders open.</Leeg>}
      {!!m.opWerk.length && (<><H2>Op werk checken</H2><Lijst>{m.opWerk.map((w) => <Rij key={w} l={w} />)}</Lijst><p className="d-voetnoot">Een foto van het etiket is genoeg.</p></>)}
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
  herstel: Herstel, training: Training, lichaam: Lichaam, taken: Taken,
  zaak: Zaak, omzet: Omzet, mail: Mail, meppie: Meppie, geld: Geld, brief: Brief, meer: Meer,
}
