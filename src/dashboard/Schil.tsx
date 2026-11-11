import type { ReactNode } from 'react'
import { Ic, glyph, type GlyphNaam } from './teken'
import './dashboard.css'

export type Pagina =
  | 'overzicht' | 'herstel' | 'training' | 'gewicht' | 'schermtijd' | 'taken' | 'logboek' | 'trends'
  | 'zaak' | 'omzet' | 'mail' | 'meppie' | 'geld' | 'brief' | 'meer' | 'instellingen'

export const NAV: { p: Pagina; naam: string; g: GlyphNaam; kleur: string; groep: string | null }[] = [
  { p: 'overzicht', naam: 'Overzicht', g: 'overzicht', kleur: 'var(--blue)', groep: null },
  { p: 'herstel', naam: 'Herstel', g: 'hart', kleur: 'var(--orange)', groep: 'Persoonlijk' },
  { p: 'training', naam: 'Training', g: 'halter', kleur: 'var(--green)', groep: 'Persoonlijk' },
  { p: 'gewicht', naam: 'Gewicht', g: 'weegschaal', kleur: 'var(--purple)', groep: 'Persoonlijk' },
  { p: 'schermtijd', naam: 'Schermtijd', g: 'klok', kleur: 'var(--blue)', groep: 'Persoonlijk' },
  { p: 'taken', naam: 'Taken', g: 'lijst', kleur: 'var(--blue)', groep: 'Persoonlijk' },
  { p: 'logboek', naam: 'Logboek', g: 'boek', kleur: 'var(--indigo)', groep: 'Persoonlijk' },
  { p: 'trends', naam: 'Trends', g: 'lijn', kleur: 'var(--teal)', groep: 'Persoonlijk' },
  { p: 'zaak', naam: 'Vandaag in de zaak', g: 'winkel', kleur: 'var(--teal)', groep: 'Bregje' },
  { p: 'omzet', naam: 'Omzet', g: 'grafiek', kleur: 'var(--teal)', groep: 'Bregje' },
  { p: 'mail', naam: 'Mail & Guestplan', g: 'mail', kleur: 'var(--pink)', groep: 'Bregje' },
  { p: 'meppie', naam: 'Meppie', g: 'spons', kleur: 'var(--mint)', groep: 'Bregje' },
  { p: 'geld', naam: 'Geld & uren', g: 'euro', kleur: 'var(--green)', groep: 'Week' },
  { p: 'brief', naam: 'Ochtendbrief', g: 'zon', kleur: 'var(--orange)', groep: 'Week' },
]

const TABS: { p: Pagina; naam: string; g: GlyphNaam }[] = [
  { p: 'overzicht', naam: 'Overzicht', g: 'overzicht' },
  { p: 'logboek', naam: 'Logboek', g: 'boek' },
  { p: 'taken', naam: 'Taken', g: 'lijst' },
  { p: 'zaak', naam: 'Bregje', g: 'winkel' },
  { p: 'meer', naam: 'Meer', g: 'meer' },
]

export function Schil({
  actief, onNaar, badges, sync, bijgewerkt, children,
}: {
  actief: Pagina
  onNaar: (p: Pagina) => void
  badges: Partial<Record<Pagina, { t: number | string; rood?: boolean }>>
  sync: string
  bijgewerkt: string | null
  children: ReactNode
}) {
  let groep: string | null = null
  // Op de telefoon hoort elke pagina die geen eigen tab heeft bij "Meer".
  const tab = TABS.some((t) => t.p === actief) ? actief : 'meer'
  return (
    <div className="d-schil">
      <nav className="d-zij" aria-label="Onderdelen">
        <div className="d-app">
          <span className="d-logo">D</span>
          <div><b>Daily</b><span>{bijgewerkt ? `brief van ${bijgewerkt}` : 'nog geen brief'}</span></div>
        </div>
        {NAV.map((n) => {
          const kop = n.groep && n.groep !== groep ? <div className="d-sectie">{n.groep}</div> : null
          groep = n.groep
          const b = badges[n.p]
          return (
            <div key={n.p}>
              {kop}
              <button type="button" className="d-nav" aria-current={actief === n.p ? 'page' : undefined} onClick={() => onNaar(n.p)}>
                <Ic g={n.g} kleur={n.kleur} maat={22} />
                {n.naam}
                {b && <span className={`badge ${b.rood ? 'rood' : ''}`}>{b.t}</span>}
              </button>
            </div>
          )
        })}
        <div className="d-zij-voet">
          <button type="button" className="d-nav" aria-current={actief === 'instellingen' ? 'page' : undefined} onClick={() => onNaar('instellingen')}>
            <Ic g="tandwiel" kleur="#8e8e93" maat={22} />Instellingen
          </button>
          <div className="d-sync">{sync}</div>
        </div>
      </nav>

      <main className="d-main">{children}</main>

      <nav className="d-tabs" aria-label="Tabs">
        {TABS.map((t) => {
          const b = badges[t.p]
          return (
            <button key={t.p} type="button" aria-current={tab === t.p ? 'page' : undefined} onClick={() => onNaar(t.p)}>
              {glyph(t.g)}
              {t.naam}
              {b?.rood && <span className="badge">{b.t}</span>}
            </button>
          )
        })}
      </nav>
    </div>
  )
}
