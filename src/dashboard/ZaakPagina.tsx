import { useLayoutEffect, useRef, useState } from 'react'
import { eur, komma, korteDag, type Model } from './model'
import type { PaginaProps } from './Paginas'

/** Vandaag in de zaak (sinds 11 nov 2026, ronde per onderdeel): mijn voorstel met toelichting en
 *  versies, avondverloop (aankomsten + bezetting op één tijdlijn), rooster tegenover voorstel,
 *  rollen, vooruitblik 7 dagen en de bijzonderheden. */

const min = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + (m || 0) }
const klok = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(Math.round(m % 60)).padStart(2, '0')}`
const tijdNl = (iso: string) => new Date(iso).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })
const ROL_KLEUR: Record<string, string> = { mep: 'var(--orange)', open: 'var(--teal)', sluit: 'var(--indigo)', kassa: 'var(--pink)', lunch: 'var(--label2)' }

function Rollen({ rollen }: { rollen: string[] }) {
  if (!rollen.length) return null
  return <span className="d-rollen">{rollen.map((r) => <span key={r} style={{ color: ROL_KLEUR[r] ?? 'var(--label2)', background: `color-mix(in srgb, ${ROL_KLEUR[r] ?? 'var(--label2)'} 14%, transparent)` }}>{r}</span>)}</span>
}

function Avondverloop({ m }: { m: Model }) {
  const doos = useRef<HTMLDivElement>(null)
  const [w, setW] = useState(700)
  useLayoutEffect(() => {
    const el = doos.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setW(Math.max(300, e.contentRect.width)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const bv = m.bregje?.vandaag
  const mensen = bv?.voorstel?.mensen ?? []
  const aankomsten = m.rapportVanVandaag ? m.rapport?.aankomsten ?? [] : []
  const sluit = (afd: string) => (afd === 'keuken' ? bv?.sluit.keuken : bv?.sluit.bediening) ?? '22:00'
  const begin = Math.min(13 * 60, ...mensen.map((p) => min(p.van)))
  const eind = Math.max(22 * 60 + 30, ...mensen.map((p) => min(p.tot ?? sluit(p.afdeling))))
  const naam = 64, rechts = 8
  const x = (t: number) => naam + ((t - begin) / (eind - begin)) * (w - naam - rechts)
  const balkH = 70, rij = 22
  const maxG = Math.max(1, ...aankomsten.map((a) => a.gasten))
  let lopend = 0
  const cum = aankomsten.map((a) => ({ ...a, tot: (lopend += a.gasten) }))
  const h = (aankomsten.length ? balkH + 16 : 0) + mensen.length * rij + 26
  const top = aankomsten.length ? balkH + 16 : 0
  const uren = Array.from({ length: Math.floor(eind / 60) - Math.ceil(begin / 60) + 1 }, (_, i) => (Math.ceil(begin / 60) + i) * 60)
  const nu = new Date()
  const nuMin = nu.getHours() * 60 + nu.getMinutes()
  const kwartier = ((w - naam - rechts) / ((eind - begin) / 15)) * 0.7
  return (
    <div ref={doos}>
      <svg width={w} height={h} role="img" aria-label="Aankomsten en bezetting op één tijdlijn" style={{ display: 'block', overflow: 'visible' }}>
        {uren.map((u) => <g key={u}><line x1={x(u)} x2={x(u)} y1={0} y2={h - 18} stroke="var(--sep)" /><text x={x(u)} y={h - 4} textAnchor="middle" className="d-tg-as">{klok(u).slice(0, 2)}</text></g>)}
        {aankomsten.length > 0 && (
          <g>
            <text x={0} y={12} className="d-tg-as">gasten</text>
            {cum.map((a) => (
              <g key={a.tijd}>
                <rect x={x(min(a.tijd)) + 1} y={balkH - (a.gasten / maxG) * (balkH - 14)} width={Math.max(3, kwartier)} height={(a.gasten / maxG) * (balkH - 14)} rx={3} fill="var(--pink)" opacity=".85" />
                <text x={x(min(a.tijd)) + 1 + Math.max(3, kwartier) / 2} y={balkH - (a.gasten / maxG) * (balkH - 14) - 3} textAnchor="middle" className="d-tg-as">{a.gasten}</text>
              </g>
            ))}
          </g>
        )}
        {mensen.map((p, i) => {
          const y = top + i * rij
          const totS = p.tot ?? sluit(p.afdeling)
          const kleur = p.afdeling === 'keuken' ? 'var(--orange)' : 'var(--teal)'
          return (
            <g key={p.naam}>
              <text x={0} y={y + rij / 2} dominantBaseline="central" className="d-tg-as" style={{ fill: 'var(--label)', fontSize: 12 }}>{p.naam}</text>
              <rect x={x(min(p.van))} y={y + 4} width={Math.max(4, x(min(totS)) - x(min(p.van)))} height={rij - 8} rx={(rij - 8) / 2} fill={kleur} opacity={p.tot ? 0.9 : 0.55} />
              {!p.tot && <text x={x(min(totS)) + 4} y={y + rij / 2} dominantBaseline="central" className="d-tg-as">sluit</text>}
            </g>
          )
        })}
        {(['keuken', 'bediening'] as const).map((afd) => bv?.sluit[afd] && (
          <line key={afd} x1={x(min(bv.sluit[afd]!))} x2={x(min(bv.sluit[afd]!))} y1={top} y2={h - 18} stroke={afd === 'keuken' ? 'var(--orange)' : 'var(--teal)'} strokeDasharray="3 3" />
        ))}
        {m.bregje?.vandaag.datum === m.vandaag && nuMin > begin && nuMin < eind && <line x1={x(nuMin)} x2={x(nuMin)} y1={0} y2={h - 18} stroke="var(--red)" strokeWidth="1.5" />}
      </svg>
      <div className="d-legenda" style={{ flexWrap: 'wrap' }}>
        {aankomsten.length > 0 && <span><i className="d-blokje" style={{ background: 'var(--pink)' }} />aankomsten per kwartier ({cum.at(-1)?.tot} gasten)</span>}
        <span><i className="d-blokje" style={{ background: 'var(--orange)' }} />keuken</span>
        <span><i className="d-blokje" style={{ background: 'var(--teal)' }} />voorkant</span>
        <span>vaag = tot sluit · stippellijn = verwachte sluit</span>
      </div>
      {!aankomsten.length && <p className="d-voetnoot" style={{ margin: '8px 0 0' }}>De aankomsten per kwartier komen mee vanaf de volgende ochtendroutine.</p>}
    </div>
  )
}

function RoosterVsVoorstel({ m }: { m: Model }) {
  const bv = m.bregje?.vandaag
  const rooster = bv?.rooster?.mensen ?? []
  const voorstel = bv?.voorstel?.mensen ?? []
  const sluit = (afd: string) => (afd === 'keuken' ? bv?.sluit.keuken : bv?.sluit.bediening) ?? '22:00'
  const namen = [...new Set([...rooster.map((r) => r.naam), ...voorstel.map((v) => v.naam)])]
  const rijen = namen.map((naam) => {
    const r = rooster.find((x) => x.naam === naam)
    const v = voorstel.find((x) => x.naam === naam)
    const vTot = v ? v.tot ?? sluit(v.afdeling) : null
    const wat: string[] = []
    if (r && !v) wat.push('vrij')
    if (!r && v) wat.push('extra')
    if (r && v && min(v.van) > min(r.van)) wat.push(`${min(v.van) - min(r.van)} min later`)
    if (r && v && min(v.van) < min(r.van)) wat.push(`${min(r.van) - min(v.van)} min eerder`)
    if (r && v && vTot && min(vTot) < min(r.tot) - 5) wat.push(`om ${vTot} naar huis`)
    const verschil = (v?.kosten ?? 0) - (r?.kosten ?? 0)
    return { naam, r, v, vTot, wat, verschil, afd: (v ?? r)!.afdeling }
  }).sort((a, b) => (a.afd === b.afd ? min((a.v ?? a.r)!.van) - min((b.v ?? b.r)!.van) : a.afd === 'keuken' ? -1 : 1))
  if (!rooster.length) return <div className="d-lijst"><div className="d-rij"><span className="tekst d-mut">Rooster niet beschikbaar (de personeelsapp was niet bereikbaar bij de export).</span></div></div>
  return (
    <div className="d-lijst">
      {rijen.map((x) => (
        <div key={x.naam} className="d-rij">
          <span className="tekst">
            <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>{x.naam}<Rollen rollen={x.v?.rollen ?? (x.r?.rol ? [x.r.rol] : [])} /></span>
            <small>
              {x.afd === 'keuken' ? 'Keuken' : 'Voorkant'} · rooster {x.r ? `${x.r.van}–${x.r.tot}` : '—'} → voorstel {x.v ? `${x.v.van}–${x.v.tot ?? 'sluit'}` : 'vrij'}
              {x.wat.length ? ` · ${x.wat.join(', ')}` : ''}
            </small>
          </span>
          <span className={`waarde ${x.verschil < -1 ? 'd-goed' : x.verschil > 1 ? 'd-let' : ''}`}>{Math.abs(x.verschil) < 1 ? '—' : `${x.verschil < 0 ? '−' : '+'}${eur(Math.abs(x.verschil))}`}</span>
        </div>
      ))}
      <div className="d-rij"><span className="tekst"><b>Totaal</b><small>rooster {eur(bv!.rooster!.kosten)} → voorstel {eur(bv!.voorstel?.kosten ?? 0)}</small></span>
        <span className="waarde d-goed"><b>{bv!.voorstel ? `−${eur(bv!.rooster!.kosten - bv!.voorstel.kosten)}` : ''}</b></span></div>
    </div>
  )
}

export function ZaakPagina({ m }: PaginaProps) {
  const bv = m.bregje?.vandaag
  const r = m.rapport
  const versies = bv?.versies ?? []
  const laatste = versies.at(-1)
  const [alleVersies, setAlleVersies] = useState(false)
  const vooruit = m.rapportVanVandaag ? r?.vooruit ?? [] : []
  const maxVooruit = Math.max(1, ...vooruit.map((d) => d.gasten))

  return (
    <div className="d-pagina">
      <h1 className="d-h1">Vandaag in de zaak</h1>
      <p className="d-sub">{bv ? `${bv.reservering ? `${bv.reservering.aantal ?? '?'} reserveringen · ${bv.reservering.gasten} gasten · ` : ''}verwacht ~${bv.verwacht.gasten}` : 'Nog geen gegevens'}</p>
      {r && !m.rapportVanVandaag && <p className="d-voetnoot" style={{ margin: '-12px 0 18px' }}>Rapport van {korteDag(r.datum)}: de ochtendroutine heeft vandaag nog niet gedraaid.</p>}

      {bv && (
        <section className="d-duiding">
          <div className="d-duiding-kop" style={{ color: 'var(--teal)' }}>Mijn voorstel{laatste ? ` · ${tijdNl(laatste.tijd)}` : ''}</div>
          <p>{laatste?.toelichting ?? r?.bezettingNoot ?? (bv.voorstel ? 'Voorstel vastgelegd zonder toelichting.' : 'Nog geen voorstel vastgelegd.')}</p>
          <div className="d-signalen">
            {bv.rooster && <span>rooster {bv.rooster.pct != null ? `${komma(bv.rooster.pct)}%` : ''} · {eur(bv.rooster.kosten)}</span>}
            {bv.voorstel && <span className={bv.voorstel.pct != null && bv.voorstel.pct <= 27 ? 'rustig' : ''}>voorstel {bv.voorstel.pct != null ? `${komma(bv.voorstel.pct)}%` : ''} · {eur(bv.voorstel.kosten)}</span>}
            <span className="rustig" style={{ background: 'var(--fill)', color: 'var(--label2)' }}>budget {eur(bv.verwacht.budget)} (27%)</span>
            {bv.rooster && bv.voorstel && <span className="rustig">scheelt {eur(bv.rooster.kosten - bv.voorstel.kosten)}</span>}
          </div>
          {r?.bezettingNoot && laatste?.toelichting && <p className="d-voetnoot" style={{ margin: '10px 0 0' }}>{r.bezettingNoot}</p>}
        </section>
      )}

      <h2 className="d-h2" style={{ marginTop: 26 }}>Avondverloop</h2>
      <div className="d-lijst d-grafiek">{bv?.voorstel ? <Avondverloop m={m} /> : <p className="d-mut" style={{ margin: 0 }}>Nog geen voorstel om te tonen.</p>}</div>

      <h2 className="d-h2" style={{ marginTop: 26 }}>Rooster → voorstel</h2>
      <RoosterVsVoorstel m={m} />
      <p className="d-voetnoot">Groen = goedkoper dan het rooster. Rollen: mep, open en sluit volgen uit de tijden; kassa zet ik er zelf bij.</p>

      {versies.length > 0 && (
        <>
          <h2 className="d-h2" style={{ marginTop: 26 }}>Versies vandaag</h2>
          <div className="d-lijst">
            {[...versies].reverse().slice(0, alleVersies ? undefined : 3).map((v, i) => (
              <div key={v.tijd} className="d-rij">
                <span className="tekst"><b>{tijdNl(v.tijd)}{i === 0 ? ' · huidig' : ''}</b><small>{v.toelichting ?? `${v.mensen.length} mensen`}</small></span>
                <span className="waarde">{v.pct != null ? `${komma(v.pct)}%` : ''} · {eur(v.kosten)}</span>
              </div>
            ))}
          </div>
          {versies.length > 3 && <button type="button" className="d-knop zacht" style={{ marginTop: 8 }} onClick={() => setAlleVersies(!alleVersies)}>{alleVersies ? 'Minder' : `Alle ${versies.length} versies`}</button>}
        </>
      )}

      <h2 className="d-h2" style={{ marginTop: 26 }}>Komende 7 dagen</h2>
      {vooruit.length ? (
        <div className="d-lijst">
          {vooruit.map((d) => (
            <div key={d.datum} className="d-rij">
              <span className="tekst">{korteDag(d.datum)}<small>{d.reserveringen} reserveringen{d.groepen?.length ? ` · ${d.groepen.map((g) => `${g.naam} ${g.aantal} p${g.menu ? '' : ' (menu volgt)'}`).join(', ')}` : ''}</small></span>
              <span style={{ width: 120, flex: 'none' }}><span className="d-balk"><i style={{ width: `${(d.gasten / maxVooruit) * 100}%`, background: 'var(--pink)' }} /></span></span>
              <span className="waarde" style={{ minWidth: 70 }}>{d.gasten} gasten</span>
            </div>
          ))}
        </div>
      ) : <div className="d-lijst"><div className="d-rij"><span className="tekst d-mut">Komt mee vanaf de volgende ochtendroutine.</span></div></div>}

      <h2 className="d-h2" style={{ marginTop: 26 }}>Bijzonderheden</h2>
      {r?.dag ? (
        <div className="d-lijst">
          <div className="d-rij"><span className="tekst">{r.dag.groepen.length ? r.dag.groepen.map((g) => `${g.naam}: ${g.aantal} p om ${g.tijd}${g.menu ? '' : ' (menu ontbreekt)'}`).join(' · ') : 'Geen groepen ≥ 12'}</span></div>
          <div className="d-rij"><span className="tekst">{r.dag.allergieen.length ? r.dag.allergieen.join(' · ') : 'Geen allergieën'}</span></div>
          {r.dag.wensen.map((w) => { const [wie, ...wat] = w.split(':'); return <div key={w} className="d-rij"><span className="tekst">{wie}{wat.length ? <small>{wat.join(':').trim()}</small> : null}</span></div> })}
        </div>
      ) : <div className="d-lijst"><div className="d-rij"><span className="tekst d-mut">Nog geen Guestplan-dag.</span></div></div>}
    </div>
  )
}
