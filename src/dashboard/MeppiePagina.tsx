import { useState } from 'react'
import { nieuwId } from '../lib/opslag'
import { nuISO } from '../lib/datum'
import { korteDag, komma, perDag } from './model'
import type { MeppieMelding } from './typen'
import type { PaginaProps } from './Paginas'

/** Meppie (sinds 11 nov 2026, ronde per onderdeel): stand van vandaag, Terugkoelen invullen, afwijking melden,
 *  de temperatuurlijst van de laatste dinsdag, en 14 dagen geschiedenis. De routine verwerkt meldingen op Meppie. */

const LIJSTEN = ['Schoonmaak keuken', 'Schoonmaak bediening', 'Temperatuur', 'Apparaat kapot of storing']
const getal = (s: string) => { const n = Number(s.replace(',', '.')); return s.trim() && Number.isFinite(n) ? n : null }

/** "60–70", "-23 – -18" → [min, max] */
function grenzen(marge: string): [number, number] | null {
  const m = marge.replace(/\s/g, '').match(/^(-?\d+(?:[.,]\d+)?)[–-](-?\d+(?:[.,]\d+)?)$/)
  if (!m) return null
  const a = Number(m[1].replace(',', '.')), b = Number(m[2].replace(',', '.'))
  return [Math.min(a, b), Math.max(a, b)]
}

function laatsteDinsdag(vandaag: string) {
  const d = new Date(`${vandaag}T12:00:00`)
  d.setDate(d.getDate() - ((d.getDay() + 5) % 7))
  return d.toISOString().slice(0, 10)
}

function Terugkoelen({ voorDatum, onVerstuur }: { voorDatum: string; onVerstuur: (m: MeppieMelding) => void }) {
  const [product, setProduct] = useState('')
  const [aanvang, setAanvang] = useState('')
  const [na2, setNa2] = useState('')
  const [na5, setNa5] = useState('')
  const [actie, setActie] = useState('')
  const [klaar, setKlaar] = useState(false)
  const n5 = getal(na5)
  const boven = n5 != null && n5 > 7
  const kan = product.trim() && getal(aanvang) != null && getal(na2) != null && n5 != null && (!boven || actie.trim())
  if (klaar) return <p className="d-voetnoot" style={{ margin: 0 }}>Verstuurd. De routine vult het morgenochtend in op Meppie; hieronder zie je wanneer het verwerkt is.</p>
  return (
    <div className="d-formulier">
      <label className="breed"><span>Product</span><input id="tk-product" value={product} placeholder="bijv. dilleroomsaus" onChange={(e) => setProduct(e.target.value)} /></label>
      <label><span>Aanvang °C</span><input id="tk-aanvang" inputMode="decimal" value={aanvang} placeholder="72" onChange={(e) => setAanvang(e.target.value)} /></label>
      <label><span>Na 2 uur °C</span><input id="tk-na2" inputMode="decimal" value={na2} placeholder="33" onChange={(e) => setNa2(e.target.value)} /></label>
      <label><span>Na 5 uur °C</span><input id="tk-na5" inputMode="decimal" value={na5} placeholder="6" onChange={(e) => setNa5(e.target.value)} /></label>
      {boven && (
        <label className="breed"><span className="d-let">Boven de norm (7 °C na 5 uur): genomen actie</span><input id="tk-actie" value={actie} placeholder="bijv. weggegooid" onChange={(e) => setActie(e.target.value)} /></label>
      )}
      <div className="breed d-knoppen" style={{ marginTop: 4 }}>
        <button type="button" className="d-knop" disabled={!kan} onClick={() => {
          onVerstuur({ id: nieuwId(), soort: 'terugkoelen', voorDatum, gemaakt: nuISO(),
            data: { product: product.trim(), aanvang: getal(aanvang)!, na2: getal(na2)!, na5: n5!, actie: actie.trim() || undefined } })
          setKlaar(true)
        }}>Verstuur naar de routine</button>
        <span className="d-mut" style={{ fontSize: 13 }}>Voor dinsdag {korteDag(voorDatum).split(' ')[1]}. Norm: binnen 5 uur 7 °C of kouder.</span>
      </div>
    </div>
  )
}

function Afwijking({ vandaag, onVerstuur }: { vandaag: string; onVerstuur: (m: MeppieMelding) => void }) {
  const [lijst, setLijst] = useState(LIJSTEN[0])
  const [datum, setDatum] = useState(vandaag)
  const [wat, setWat] = useState('')
  const [klaar, setKlaar] = useState(false)
  if (klaar) return <p className="d-voetnoot" style={{ margin: 0 }}>Gemeld. De routine registreert het als afwijking in plaats van "normaal". <button type="button" className="d-linkknop" onClick={() => { setKlaar(false); setWat('') }}>Nog een melden</button></p>
  return (
    <div className="d-formulier">
      <label className="breed"><span>Waar</span>
        <select id="af-lijst" value={lijst} onChange={(e) => setLijst(e.target.value)}>{LIJSTEN.map((l) => <option key={l}>{l}</option>)}</select>
      </label>
      <label><span>Datum</span><input id="af-datum" type="date" value={datum} max={vandaag} onChange={(e) => setDatum(e.target.value)} /></label>
      <label className="breed"><span>Wat is er</span><textarea id="af-wat" rows={3} value={wat} placeholder="bijv. vriezer 2 slaat af, stond op -12 °C; afzuigkap niet schoongemaakt" onChange={(e) => setWat(e.target.value)} /></label>
      <div className="breed d-knoppen" style={{ marginTop: 4 }}>
        <button type="button" className="d-knop" disabled={!wat.trim()} onClick={() => {
          onVerstuur({ id: nieuwId(), soort: 'afwijking', voorDatum: datum, gemaakt: nuISO(), data: { lijst, wat: wat.trim() } })
          setKlaar(true)
        }}>Meld afwijking</button>
      </div>
    </div>
  )
}

export function MeppiePagina({ m, meppie, onMeppieMelding }: PaginaProps) {
  const r = m.rapport
  const md = m.rapportVanVandaag || r ? r?.meppieDetail : undefined
  const t = md?.temperatuur
  const terugkoelenOpen = !!t?.open?.some((x) => x.item === 'Terugkoelen')
  const dinsdag = terugkoelenOpen && t ? t.datum : laatsteDinsdag(m.vandaag)
  const groepen = t ? [...new Set(t.items.map((x) => x.groep))] : []
  const dagen = perDag([], 14, () => null).map((p) => p.datum)
  const kleur = (s?: string) => (s === 'gereed' ? 'var(--green)' : s === 'ingehaald' ? 'var(--orange)' : s === 'open' ? 'var(--red)' : 'var(--fill)')

  return (
    <div className="d-pagina">
      <h1 className="d-h1">Meppie</h1>
      <p className="d-sub">Schoonmaak en temperatuur, geregistreerd door de ochtendroutine</p>

      <div className="d-logboek">
        <div>
          <h2 className="d-h2">Vandaag</h2>
          {r?.meppie?.length ? (
            <div className="d-lijst">{r.meppie.map((x) => <div key={x.label} className="d-rij"><span className="tekst">{x.label}</span><span className={`waarde ${x.ok ? 'd-goed' : 'd-let'}`}>{x.waarde}</span></div>)}</div>
          ) : <div className="d-lijst"><div className="d-rij"><span className="tekst d-mut">Nog niets gemeld vandaag.</span></div></div>}

          <h2 className="d-h2" style={{ marginTop: 24 }}>Terugkoelen{terugkoelenOpen ? <span className="d-label">open</span> : null}</h2>
          <div className="d-lijst d-grafiek">
            {terugkoelenOpen || !t ? <Terugkoelen voorDatum={dinsdag} onVerstuur={onMeppieMelding} />
              : <p className="d-mut" style={{ margin: 0, fontSize: 14 }}>Terugkoelen van {korteDag(t.datum)} is ingevuld. Volgende meting: dinsdag.</p>}
          </div>

          <h2 className="d-h2" style={{ marginTop: 24 }}>Afwijking melden</h2>
          <div className="d-lijst d-grafiek"><Afwijking vandaag={m.vandaag} onVerstuur={onMeppieMelding} /></div>

          {meppie.length > 0 && (
            <>
              <h2 className="d-h2" style={{ marginTop: 24 }}>Jouw meldingen</h2>
              <div className="d-lijst">
                {meppie.slice(0, 8).map((x) => (
                  <div key={x.id} className="d-rij">
                    <span className="tekst">
                      {x.soort === 'terugkoelen' ? `Terugkoelen ${x.data.product}: ${komma(x.data.aanvang ?? 0)} → ${komma(x.data.na2 ?? 0)} → ${komma(x.data.na5 ?? 0)} °C` : `${x.data.lijst}: ${x.data.wat}`}
                      <small>voor {korteDag(x.voorDatum)}{x.verwerkt ? ` · ${x.verwerkt.wat || 'verwerkt'}` : ''}</small>
                    </span>
                    <span className={`waarde ${x.verwerkt ? 'd-goed' : 'd-let'}`}>{x.verwerkt ? `verwerkt ${korteDag(x.verwerkt.op.slice(0, 10))}` : 'wacht op routine'}</span>
                  </div>
                ))}
              </div>
            </>
          )}

          <h2 className="d-h2" style={{ marginTop: 24 }}>Laatste 14 dagen</h2>
          <div className="d-lijst d-grafiek">
            {md?.log ? (
              <>
                {(['keuken', 'bediening'] as const).map((l) => (
                  <div key={l} className="d-histrij">
                    <span>{l === 'keuken' ? 'Keuken' : 'Bediening'}</span>
                    <span className="d-histcellen">{dagen.map((d) => <i key={d} title={`${korteDag(d)}: ${md.log[d]?.[l] ?? 'onbekend'}`} style={{ background: kleur(md.log[d]?.[l]) }} />)}</span>
                  </div>
                ))}
                <div className="d-histrij">
                  <span>Temperatuur</span>
                  <span className="d-histcellen">{dagen.map((d) => {
                    const tv = md.log[d]?.temperatuur
                    return <i key={d} title={tv ? `${korteDag(d)}: ${tv}` : ''} style={{ background: tv ? (tv.startsWith('20/') ? 'var(--green)' : 'var(--orange)') : 'transparent' }} />
                  })}</span>
                </div>
                <div className="d-histrij as"><span /><span className="d-histcellen">{dagen.map((d) => <small key={d}>{Number(d.slice(8))}</small>)}</span></div>
                <div className="d-legenda"><span><i className="d-blokje" style={{ background: 'var(--green)' }} />gereed</span><span><i className="d-blokje" style={{ background: 'var(--orange)' }} />ingehaald / niet compleet</span><span><i className="d-blokje" style={{ background: 'var(--red)' }} />open</span></div>
                {Object.entries(md.log).filter(([, v]) => v.noot).reverse().slice(0, 3).map(([d, v]) => <p key={d} className="d-voetnoot" style={{ margin: '6px 0 0' }}>{korteDag(d)}: {v.noot}</p>)}
              </>
            ) : <p className="d-mut" style={{ margin: 0 }}>Nog geen geschiedenis.</p>}
          </div>
        </div>

        <div>
          <h2 className="d-h2">Temperatuurlijst{t ? ` ${korteDag(t.datum)}` : ''}</h2>
          {t ? (
            <>
              {groepen.map((g) => (
                <div key={g} style={{ marginBottom: 12 }}>
                  <div className="d-dagkopje">{g}</div>
                  <div className="d-lijst">
                    {t.items.filter((x) => x.groep === g).map((x) => {
                      const gr = grenzen(x.marge)
                      const binnen = x.temp != null && gr ? x.temp >= gr[0] && x.temp <= gr[1] : null
                      return (
                        <div key={x.item} className="d-rij">
                          <span className="tekst" style={{ fontSize: 14 }}>{x.item}<small>{[x.product, `marge ${x.marge} °C`, x.vinkjes ? 'alle vinkjes' : x.vinkjes === false ? 'niet alle vinkjes' : null, x.actie].filter(Boolean).join(' · ')}</small></span>
                          <span className={`waarde ${binnen === false || x.afwijking ? 'd-let' : 'd-goed'}`}>{x.temp != null ? `${komma(x.temp)} °C` : '–'}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
              {t.open.map((x) => <p key={x.item} className="d-voetnoot">{x.item} staat open{x.wacht_op ? `: wacht op ${x.wacht_op}` : ''}{x.norm ? ` (norm: ${x.norm})` : ''}.</p>)}
              <p className="d-voetnoot">Zoals het op Meppie staat{t.geregistreerd ? `, geregistreerd om ${t.geregistreerd}` : ''}. Groen = binnen de marge.</p>
            </>
          ) : <div className="d-lijst"><div className="d-rij"><span className="tekst d-mut">Nog geen temperatuurlijst bekend.</span></div></div>}
        </div>
      </div>
    </div>
  )
}
