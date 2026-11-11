import { useState } from 'react'
import { Balk } from './teken'
import { eur, komma, korteDag } from './model'
import type { PaginaProps } from './Paginas'

/** Geld & uren (sinds 11 nov 2026, ronde per onderdeel): de laatste week de hele week zichtbaar, categorieën tegen
 *  een gewone week, gewoontes en de leuke-dingenpot, grootste posten en sluipkosten, uren per week, en per maand. */

const MAAND = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec']
const u = (n: number | null) => (n == null ? '–' : `${komma(n, n % 1 ? 1 : 0)} u`)

export function GeldPagina({ m }: PaginaProps) {
  const g = m.geldWeek
  const [maandMaat, setMaandMaat] = useState<'inuit' | 'eten'>('inuit')
  if (!g) {
    return (
      <div className="d-pagina smal">
        <h1 className="d-h1">Geld & uren</h1>
        <p className="d-sub">Nog geen gegevens. Ze komen mee met de volgende ochtendrun (geld_naar_app.py).</p>
      </div>
    )
  }
  const pot = g.pot
  const potPct = pot ? (pot.op / pot.budget) * 100 : 0
  const tijdPct = pot ? (pot.dagenVoorbij / pot.dagenInMaand) * 100 : 0
  const potKoers = pot ? (potPct <= tijdPct + 10 ? 'op koers' : 'sneller dan de maand') : null
  const maxCat = Math.max(1, ...g.categorieen.map((c) => Math.max(c.uit, c.gem)))
  const maxGew = Math.max(1, ...g.gewoontesReeks.map((w) => Math.max(w.fastfood, w.ah)))
  const urenMax = Math.max(1, ...g.uren.map((w) => (w.bregje ?? 0) + (w.bedrijf ?? 0)))
  const laatsteUren = g.uren.at(-1)
  const maanden = g.maanden.slice(-12)
  const maandMax = Math.max(1, ...maanden.map((x) => (maandMaat === 'inuit' ? Math.max(x.in, x.uit) : x.uitEten + x.fastfood)))

  return (
    <div className="d-pagina">
      <h1 className="d-h1">Geld & uren</h1>
      <p className="d-sub">Week {korteDag(g.week.van)} – {korteDag(g.week.tot)} · uit het ABN-afschrift{!g.compleet ? ' (het nieuwe afschrift is nog niet binnen)' : ''}</p>

      <div className="d-stats4">
        <div className="d-stat"><span>Uit</span><b className="d-num">{eur(g.uit)}</b><small className={g.uit > g.gem * 1.15 ? 'd-let' : g.uit < g.gem * 0.85 ? 'd-goed' : ''}>gewone week {eur(g.gem)}</small></div>
        <div className="d-stat"><span>In</span><b className="d-num">{eur(g.in)}</b><small>{g.inkomsten.map((x) => x.naam).join(', ')}</small></div>
        <div className="d-stat"><span>Potjes</span><b className="d-num">{g.potjes.netto < 0 ? '−' : '+'}{eur(Math.abs(g.potjes.netto))}</b><small>{g.potjes.netto < 0 ? 'eruit gehaald' : 'erin gezet'}{g.potjes.belegd ? ` · ${eur(g.potjes.belegd)} belegd` : ''}</small></div>
        <div className="d-stat"><span>Gewerkt</span><b className="d-num">{laatsteUren ? u((laatsteUren.bregje ?? 0) + (laatsteUren.bedrijf ?? 0)) : '–'}</b><small>{laatsteUren ? `Bregje ${u(laatsteUren.bregje)} · eigen ${u(laatsteUren.bedrijf)}` : ''}</small></div>
      </div>

      {g.reflectie && (
        <section className="d-duiding" style={{ marginTop: 14 }}>
          <div className="d-duiding-kop" style={{ color: 'var(--green)' }}>Mijn reflectie</div>
          <p style={{ fontSize: 16, whiteSpace: 'pre-wrap' }}>{g.reflectie}</p>
        </section>
      )}

      <div className="d-twee" style={{ marginTop: 10 }}>
        <div>
          {/* 2. Categorieën */}
          <h2 className="d-h2">Waaraan</h2>
          <div className="d-lijst d-grafiek">
            {g.categorieen.filter((c) => c.uit > 0 || c.gem >= 10).map((c) => (
              <div key={c.naam} className="d-mixrij">
                <span>{c.naam}</span>
                <span className="d-mixbalk"><i style={{ width: `${(c.uit / maxCat) * 100}%`, background: c.uit > c.gem * 1.5 && c.uit - c.gem > 20 ? 'var(--orange)' : 'var(--green)' }} />{c.gem > 0 && <b style={{ left: `${(c.gem / maxCat) * 100}%` }} />}</span>
                <span className="d-num">{eur(c.uit)}<small>{c.keer ? ` · ${c.keer}×` : ''}</small></span>
              </div>
            ))}
            <p className="d-voetnoot" style={{ margin: '10px 0 0' }}>Streepje = een gewone week (gemiddelde van de 8 weken ervoor). Oranje = flink meer dan normaal.</p>
          </div>

          {/* 4. Grootste en duurder */}
          <h2 className="d-h2">Grootste posten</h2>
          <div className="d-lijst">{g.grootste.map((p) => <div key={p.tegenpartij + p.datum} className="d-rij"><span className="tekst">{p.tegenpartij}<small>{p.categorie} · {korteDag(p.datum)}</small></span><span className="waarde">{eur(p.bedrag, 2)}</span></div>)}</div>
          {g.duurder.length > 0 && (
            <>
              <h2 className="d-h2">Duurder geworden</h2>
              <div className="d-lijst">{g.duurder.map((d) => <div key={d.tegenpartij} className="d-rij"><span className="tekst">{d.tegenpartij}<small>van {eur(d.van, 2)} naar {eur(d.naar, 2)}</small></span><span className="waarde d-let">+{eur(d.naar - d.van, 2)}</span></div>)}</div>
              <p className="d-voetnoot">Terugkerende betalingen die hoger waren dan de vorige keer. Niet alles is een abonnement.</p>
            </>
          )}
        </div>

        <div>
          {/* 3. Pot en gewoontes */}
          {pot && (
            <>
              <h2 className="d-h2">Leuke-dingenpot {MAAND[Number(pot.maand.slice(5)) - 1]}</h2>
              <div className="d-lijst d-grafiek">
                <div className="kop"><b className="d-num" style={{ fontSize: 24 }}>{eur(pot.op)}<small>van {eur(pot.budget)}</small></b><span className={potKoers === 'op koers' ? 'd-goed' : 'd-let'}>{potKoers}</span></div>
                <Balk pct={potPct} kleur={potKoers === 'op koers' ? 'var(--green)' : 'var(--orange)'} doel={tijdPct} />
                <p className="d-voetnoot" style={{ margin: '8px 0 0' }}>
                  {pot.stand ? `Vanaf jouw stand van ${korteDag(pot.stand.op)}: nog ${eur(pot.stand.over)} over${pot.stand.erna ? `, daarna ${eur(pot.stand.erna)} uitgegeven` : ''}. Nog over: ${eur(pot.budget - pot.op)}. ` : ''}
                  Streepje = hoe ver de maand is ({pot.dagenVoorbij} van {pot.dagenInMaand} dagen, t/m {korteDag(pot.tot)}).{pot.terug ? ` Na ${eur(pot.terug)} terug via Tikkie.` : ''}</p>
              </div>
            </>
          )}
          <h2 className="d-h2">Gewoontes</h2>
          <div className="d-lijst d-grafiek">
            <div className="d-twee-velden" style={{ marginTop: 0 }}>
              <div className="d-veldkaart"><span>Fastfood na 21:00</span>{g.gewoontes.fastfood.keer}× <small className="d-mut" style={{ fontWeight: 400 }}>gem. {komma(g.gewoontes.fastfood.gem)}× · {eur(g.gewoontes.fastfood.bedrag, 2)}</small></div>
              <div className="d-veldkaart"><span>AH onder €10</span>{g.gewoontes.ah.keer}× <small className="d-mut" style={{ fontWeight: 400 }}>gem. {komma(g.gewoontes.ah.gem)}× · {eur(g.gewoontes.ah.bedrag, 2)}</small></div>
            </div>
            <div className="d-gewoontes">
              {g.gewoontesReeks.map((w) => (
                <div key={w.maandag} title={`week van ${korteDag(w.maandag)}: fastfood ${w.fastfood}×, AH ${w.ah}×`}>
                  <span className="paar"><i style={{ height: `${(w.fastfood / maxGew) * 100}%`, background: 'var(--orange)' }} /><i style={{ height: `${(w.ah / maxGew) * 100}%`, background: 'var(--teal)' }} /></span>
                  <small>{Number(w.maandag.slice(8))}/{Number(w.maandag.slice(5, 7))}</small>
                </div>
              ))}
            </div>
            <div className="d-legenda"><span><i className="d-blokje" style={{ background: 'var(--orange)' }} />fastfood na 21:00</span><span><i className="d-blokje" style={{ background: 'var(--teal)' }} />AH onder €10</span><span>per week, 12 weken</span></div>
          </div>

          {/* 5. Uren */}
          <h2 className="d-h2">Uren per week</h2>
          <div className="d-lijst d-grafiek">
            <div className="d-urenstaven">
              {g.uren.map((w) => (
                <div key={w.van} title={`${korteDag(w.van)}: Bregje ${u(w.bregje)}, eigen ${u(w.bedrijf)}`}>
                  <span className="kolom">
                    <i style={{ height: `${((w.bedrijf ?? 0) / urenMax) * 100}%`, background: 'var(--indigo)' }} />
                    <i style={{ height: `${((w.bregje ?? 0) / urenMax) * 100}%`, background: 'var(--orange)' }} />
                  </span>
                  <b className="d-num">{komma((w.bregje ?? 0) + (w.bedrijf ?? 0), 0)}</b>
                  <small>{Number(w.van.slice(8))}/{Number(w.van.slice(5, 7))}</small>
                </div>
              ))}
            </div>
            <div className="d-legenda"><span><i className="d-blokje" style={{ background: 'var(--orange)' }} />Bregje</span><span><i className="d-blokje" style={{ background: 'var(--indigo)' }} />eigen bedrijf</span></div>
          </div>
          {laatsteUren?.perProject.length ? (
            <>
              <h2 className="d-h2">Eigen bedrijf, week {korteDag(laatsteUren.van)}</h2>
              <div className="d-lijst">{laatsteUren.perProject.map(([n, x]) => <div key={n} className="d-rij"><span className="tekst" style={{ fontSize: 14 }}><span className="d-afkap">{n}</span></span><span className="waarde">{u(x)}</span></div>)}</div>
              <p className="d-voetnoot">Uit Moneybird, zoals je de uren daar omschreef.</p>
            </>
          ) : null}
        </div>
      </div>

      {/* 6. Per maand */}
      <h2 className="d-h2" style={{ marginTop: 26 }}>Per maand</h2>
      <div className="d-lijst d-grafiek">
        <div className="d-seg" style={{ maxWidth: 360, marginBottom: 12 }}>
          <button type="button" aria-selected={maandMaat === 'inuit'} onClick={() => setMaandMaat('inuit')}>In en uit</button>
          <button type="button" aria-selected={maandMaat === 'eten'} onClick={() => setMaandMaat('eten')}>Uit eten + fastfood</button>
        </div>
        <div className="d-maandstaven">
          {maanden.map((x) => {
            const w = maandMaat === 'inuit' ? x.in - x.uit : x.uitEten + x.fastfood
            return (
              <div key={x.maand} title={`${MAAND[Number(x.maand.slice(5)) - 1]}: in ${eur(x.in)}, uit ${eur(x.uit)}, uit eten ${eur(x.uitEten)}, fastfood ${eur(x.fastfood)}`}>
                <b className={`d-num ${maandMaat === 'inuit' ? (w >= 0 ? 'd-goed' : 'd-let') : ''}`}>{maandMaat === 'inuit' ? `${w >= 0 ? '+' : '−'}${eur(Math.abs(w))}` : eur(w)}</b>
                <span className={maandMaat === 'inuit' ? 'kolom naast' : 'kolom'}>
                  {maandMaat === 'inuit'
                    ? <><i style={{ height: `${(x.in / maandMax) * 100}%`, background: 'var(--teal)', opacity: x.compleet ? 1 : 0.45 }} /><i style={{ height: `${(x.uit / maandMax) * 100}%`, background: 'var(--green)', opacity: x.compleet ? 1 : 0.45 }} /></>
                    : <><i style={{ height: `${(x.fastfood / maandMax) * 100}%`, background: 'var(--orange)' }} /><i style={{ height: `${(x.uitEten / maandMax) * 100}%`, background: 'var(--pink)' }} /></>}
                </span>
                <small>{MAAND[Number(x.maand.slice(5)) - 1]}</small>
              </div>
            )
          })}
        </div>
        {maandMaat === 'inuit' && <div className="d-legenda"><span><i className="d-blokje" style={{ background: 'var(--teal)' }} />inkomsten</span><span><i className="d-blokje" style={{ background: 'var(--green)' }} />uitgaven</span><span>getal = verschil (+ = over)</span></div>}
        {maandMaat === 'eten' && <div className="d-legenda"><span><i className="d-blokje" style={{ background: 'var(--pink)' }} />uit eten en drinken</span><span><i className="d-blokje" style={{ background: 'var(--orange)' }} />fastfood</span></div>}
        <p className="d-voetnoot" style={{ margin: '8px 0 0' }}>Een vage staaf = de maand is nog niet compleet in de afschriften.</p>
        <div className="d-lijst" style={{ boxShadow: 'none', marginTop: 10 }}>
          {[...maanden].reverse().slice(0, 6).map((x) => (
            <div key={x.maand} className="d-rij" style={{ paddingLeft: 0, paddingRight: 0 }}>
              <span className="tekst">{MAAND[Number(x.maand.slice(5)) - 1]} {x.maand.slice(0, 4)}{!x.compleet && <span className="d-label">tot nu</span>}<small>potjes {x.potjes < 0 ? '−' : '+'}{eur(Math.abs(x.potjes))} · uit eten {eur(x.uitEten)} · fastfood {eur(x.fastfood)}</small></span>
              <span className="waarde" style={{ textAlign: 'right' }}>in {eur(x.in)} · uit {eur(x.uit)}<br /><b className={x.in - x.uit >= 0 ? 'd-goed' : 'd-let'} style={{ fontSize: 13 }}>{x.in - x.uit >= 0 ? '+' : '−'}{eur(Math.abs(x.in - x.uit))}</b></span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
