import { useState } from 'react'
import { WEEGSCHALEN, nettoSchermtijd } from '../types'
import { TijdGrafiek } from './TijdGrafiek'
import { CUT_START, DOEL_TEMPO, MAX_SCHERMTIJD, cutTempo, komma, korteDag, perDag, schermtijdPerWeek, uurMin } from './model'
import type { PaginaProps } from './Paginas'

/** Gewicht en Schermtijd, sinds 11 nov 2026 twee aparte pagina's (ronde per onderdeel). */

const hm = (min: number) => { const x = uurMin(min); return `${x.u}u${x.m}` }
const weegschaal = (w?: string) => WEEGSCHALEN.find((x) => x.waarde === w)?.label ?? 'XXL (oud)'
const tempoTekst = (t: number) => `${t <= 0 ? '−' : '+'}${komma(Math.abs(t), 2)} kg per week`
const oordeelKleur = (o: string | null) => (o === 'op schema' ? 'd-goed' : o ? 'd-let' : '')

export function GewichtPagina({ m, onInvul }: PaginaProps) {
  const dagenSindsCut = Math.round((new Date(`${m.vandaag}T12:00:00`).getTime() - new Date(`${CUT_START}T12:00:00`).getTime()) / 86400000) + 1
  const [periode, setPeriode] = useState<number>(dagenSindsCut)
  const g = m.gewicht
  const t = cutTempo(g.alles, m.vandaag)
  const punten = perDag(Object.values(g.alles), periode, (x) => x.kg)
  const ingevuld = punten.filter((p) => p.waarde != null).length
  const metingen = Object.values(g.alles).sort((a, b) => b.datum.localeCompare(a.datum)).slice(0, 7)

  return (
    <div className="d-pagina smal">
      <h1 className="d-h1">Gewicht</h1>
      <p className="d-sub">{g.nu ? `${g.nu.datum === m.vandaag ? 'Vanochtend' : korteDag(g.nu.datum)} ${komma(g.nu.kg)} kg · weegschaal ${weegschaal(g.nu.weegschaal)}` : 'Nog geen meting'}</p>

      <section className="d-duiding">
        <div className="d-duiding-kop" style={{ color: 'var(--purple)' }}>Tempo van de cut</div>
        {t.sinds != null ? (
          <p>
            Sinds 29 sep {t.start != null && t.nu != null ? `${komma(t.start)} → ${komma(t.nu)} kg (weekgemiddelden), ` : ''}
            gemiddeld <b className={oordeelKleur(t.oordeelSinds)}>{tempoTekst(t.sinds)}</b>.
            {t.recent != null && <> De laatste 4 weken <b className={oordeelKleur(t.oordeelRecent)}>{tempoTekst(t.recent)}</b>.</>}
          </p>
        ) : <p>Nog te weinig metingen om een tempo te berekenen.</p>}
        <div className="d-signalen">
          <span className="rustig" style={{ background: 'color-mix(in srgb, var(--purple) 14%, transparent)', color: 'var(--purple)' }}>doel {komma(DOEL_TEMPO.min)}–{komma(DOEL_TEMPO.max)} kg per week</span>
          {t.oordeelRecent && <span className={t.oordeelRecent === 'op schema' ? 'rustig' : ''}>{t.oordeelRecent === 'op schema' ? 'op schema' : `${t.oordeelRecent} dan je doel`}</span>}
        </div>
        {t.over4 && <p className="d-voetnoot" style={{ margin: '10px 0 0' }}>Op doeltempo zit je over 4 weken op {komma(t.over4.laag)}–{komma(t.over4.hoog)} kg (weekgemiddelde).</p>}
      </section>

      <div className="d-lijst d-grafiek" style={{ marginTop: 20 }}>
        <div className="kop">
          <b className="d-num" style={{ color: 'var(--purple)' }}>{g.week != null ? komma(g.week) : '–'}<small>kg weekgemiddelde</small></b>
          <span>{g.vorigeWeek != null && g.week != null ? `vorige week ${komma(g.vorigeWeek)} (${g.week - g.vorigeWeek <= 0 ? '−' : '+'}${komma(Math.abs(g.week - g.vorigeWeek))})` : ''}</span>
        </div>
        <TijdGrafiek punten={punten} kleur="var(--purple)" formatteer={(n) => `${komma(n)} kg`}
          tipExtra={(d) => (g.alles[d] ? weegschaal(g.alles[d].weegschaal) : undefined)} />
        <div className="d-grafiek-voet">
          <span>{ingevuld} van {periode} dagen gewogen</span>
          <div className="d-seg klein" role="tablist" aria-label="Periode">
            <button type="button" role="tab" aria-selected={periode === 14} onClick={() => setPeriode(14)}>2 weken</button>
            <button type="button" role="tab" aria-selected={periode === 90} onClick={() => setPeriode(90)}>3 maanden</button>
            <button type="button" role="tab" aria-selected={periode === dagenSindsCut} onClick={() => setPeriode(dagenSindsCut)}>Sinds cut</button>
          </div>
        </div>
      </div>
      <p className="d-voetnoot">Brede lijn = 7-daags gemiddelde: één weging schommelt makkelijk een kilo door vocht en zout. Tik op een punt voor de weegschaal.</p>

      <h2 className="d-h2">Laatste metingen</h2>
      <div className="d-lijst">
        {metingen.map((x) => (
          <div key={x.datum} className="d-rij"><span className="tekst">{korteDag(x.datum)}<small>{weegschaal(x.weegschaal)}</small></span><span className="waarde">{komma(x.kg)} kg</span></div>
        ))}
      </div>
      <div className="d-knoppen"><button type="button" className="d-knop" onClick={() => onInvul('gewicht')}>Gewicht invullen</button></div>
    </div>
  )
}

export function SchermtijdPagina({ m, onInvul }: PaginaProps) {
  const [dagen, setDagen] = useState<14 | 90>(14)
  const s = m.schermtijd
  // Schermtijd gaat over gisteren: de reeks eindigt gisteren.
  const punten = perDag(Object.values(s.alles), dagen + 1, (x) => nettoSchermtijd(x)).slice(0, -1)
  const ingevuld = punten.filter((p) => p.waarde != null)
  const boven = ingevuld.filter((p) => p.waarde! > MAX_SCHERMTIJD).length
  const weken = schermtijdPerWeek(s.alles, 8)
  const over = s.netto != null ? s.netto - MAX_SCHERMTIJD : null

  return (
    <div className="d-pagina smal">
      <h1 className="d-h1">Schermtijd</h1>
      <p className="d-sub">Gisteren, netto (zonder Flitsmeister)</p>

      <section className="d-duiding">
        <div className="d-duiding-kop" style={{ color: 'var(--blue)' }}>Tegen je max van 3u30</div>
        {s.netto != null ? (
          <p>
            Gisteren <b>{hm(s.netto)}</b>,{' '}
            {over! > 0 ? <b className="d-let">{hm(over!)} boven je max</b> : <b className="d-goed">{hm(-over!)} onder je max</b>}.
            {s.week != null && <> Gemiddeld deze 7 dagen {hm(s.week)}{s.week > MAX_SCHERMTIJD ? ', ook boven je max' : ', binnen je max'}.</>}
          </p>
        ) : <p>Nog niets ingevuld voor gisteren.</p>}
        {ingevuld.length > 0 && (
          <div className="d-signalen">
            <span className={boven === 0 ? 'rustig' : ''}>{boven} van {ingevuld.length} dagen boven 3u30</span>
          </div>
        )}
      </section>

      <div className="d-lijst d-grafiek" style={{ marginTop: 20 }}>
        <div className="kop"><b className="d-num" style={{ color: 'var(--blue)' }}>{s.netto != null ? hm(s.netto) : '–'}<small>gisteren</small></b><span>{s.bruto != null && s.netto != null ? `${hm(s.bruto)} bruto, ${hm(s.bruto - s.netto)} eraf` : ''}</span></div>
        <TijdGrafiek punten={punten} kleur="var(--blue)" soort="staaf" formatteer={hm}
          doel={{ waarde: MAX_SCHERMTIJD, label: 'max' }} kleurVoor={(v) => (v > MAX_SCHERMTIJD ? 'var(--orange)' : 'var(--blue)')} />
        <div className="d-grafiek-voet">
          <span>{ingevuld.length} van {dagen} dagen ingevuld</span>
          <div className="d-seg klein" role="tablist" aria-label="Periode">
            <button type="button" role="tab" aria-selected={dagen === 14} onClick={() => setDagen(14)}>2 weken</button>
            <button type="button" role="tab" aria-selected={dagen === 90} onClick={() => setDagen(90)}>3 maanden</button>
          </div>
        </div>
      </div>
      <p className="d-voetnoot">Oranje = boven je max van 3u30. Flitsmeister telt niet mee: dat is navigatie tijdens het rijden.</p>

      <h2 className="d-h2">Per week</h2>
      <div className="d-lijst">
        {[...weken].reverse().map((w, i) => (
          <div key={w.maandag} className="d-rij">
            <span className="tekst">{i === 0 ? 'Deze week' : `Week van ${korteDag(w.maandag)}`}<small>{w.dagen} {w.dagen === 1 ? 'dag' : 'dagen'} ingevuld</small></span>
            <span className={`waarde ${w.gem == null ? '' : w.gem > MAX_SCHERMTIJD ? 'd-let' : 'd-goed'}`}>{w.gem != null ? `${hm(w.gem)} per dag` : '–'}</span>
          </div>
        ))}
      </div>
      <div className="d-knoppen"><button type="button" className="d-knop" onClick={() => onInvul('schermtijd')}>Schermtijd invullen</button></div>
    </div>
  )
}
