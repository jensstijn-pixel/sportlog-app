import { useMemo, useState } from 'react'
import { TYPE_LABELS, type Herstel, type Notitie } from '../types'
import {
  WEEKDAGEN,
  korteDatum,
  maandGrid,
  maandTitel,
  parseISO,
  vandaagISO,
} from '../lib/datum'
import { Eyebrow, RondeKnop, TabBalk, Titel, TypeBadge } from '../onderdelen/ui'

export interface SyncStatus {
  tekst: string
  soort: 'goed' | 'bezig' | 'aandacht'
}

export default function Logboek({
  notities,
  status,
  onNieuw,
  onOpen,
  onInzicht,
  onInstellingen,
  openTaken,
  onTaken,
  herstelVandaag,
  onHerstel,
  onTracking,
}: {
  notities: Notitie[]
  status: SyncStatus
  onNieuw: () => void
  onOpen: (n: Notitie) => void
  onInzicht: () => void
  onInstellingen: () => void
  openTaken: number
  onTaken: () => void
  herstelVandaag?: Herstel
  onHerstel: () => void
  onTracking: () => void
}) {
  const vandaag = vandaagISO()
  const [zichtbaar, setZichtbaar] = useState(() => {
    const d = parseISO(vandaag)
    return { jaar: d.getFullYear(), maand: d.getMonth() }
  })
  const [gekozen, setGekozen] = useState(vandaag)

  const perDatum = useMemo(() => {
    const map = new Map<string, Notitie[]>()
    for (const n of notities) {
      const lijst = map.get(n.datum)
      if (lijst) lijst.push(n)
      else map.set(n.datum, [n])
    }
    return map
  }, [notities])

  const cellen = useMemo(() => maandGrid(zichtbaar.jaar, zichtbaar.maand), [zichtbaar])
  const vanDeDag = perDatum.get(gekozen) ?? []

  function verschuif(richting: number) {
    setZichtbaar(({ jaar, maand }) => {
      const d = new Date(jaar, maand + richting, 1)
      return { jaar: d.getFullYear(), maand: d.getMonth() }
    })
  }

  const statusKleur =
    status.soort === 'aandacht' ? 'text-accent' : status.soort === 'bezig' ? 'text-tekst/50' : 'text-tekst/35'

  return (
    <div className="min-h-dvh px-5 pt-[calc(env(safe-area-inset-top)+18px)] pb-40">
      <div className="flex items-end justify-between">
        <div>
          <Titel>Logboek</Titel>
          <div className="mt-1">
            <Eyebrow>{maandTitel(zichtbaar.jaar, zichtbaar.maand)}</Eyebrow>
          </div>
        </div>
        <div className="flex gap-2 pb-1">
          <RondeKnop label="Vorige maand" onClick={() => verschuif(-1)}>
            ‹
          </RondeKnop>
          <RondeKnop label="Volgende maand" onClick={() => verschuif(1)}>
            ›
          </RondeKnop>
          <RondeKnop label="Inzicht" accent onClick={onInzicht}>
            ✦
          </RondeKnop>
        </div>
      </div>

      <button
        type="button"
        onClick={onInstellingen}
        className={`mt-2 font-mono text-[10px] uppercase tracking-[0.1em] ${statusKleur}`}
      >
        {status.tekst}
      </button>

      <button
        type="button"
        onClick={onHerstel}
        className={`kaart mt-3 flex w-full items-center justify-between rounded-[16px] px-4 py-3 text-left ${
          herstelVandaag ? '' : 'border border-accent/30'
        }`}
      >
        <div className="min-w-0">
          <div className="text-[11px] uppercase tracking-[0.08em] text-tekst/40">Vannacht</div>
          {herstelVandaag ? (
            <div className="mt-1 text-[14px] text-tekst/80">
              {[
                herstelVandaag.slaapMinuten != null &&
                  `${Math.floor(herstelVandaag.slaapMinuten / 60)}u${String(
                    herstelVandaag.slaapMinuten % 60,
                  ).padStart(2, '0')}`,
                herstelVandaag.hrv != null && `HRV ${herstelVandaag.hrv}`,
                herstelVandaag.readiness != null && `readiness ${herstelVandaag.readiness}`,
              ]
                .filter(Boolean)
                .join(' · ') || 'ingevuld'}
            </div>
          ) : (
            <div className="mt-1 text-[14px] font-semibold text-accent">
              Nog niet ingevuld — tik om over te nemen
            </div>
          )}
        </div>
        <span className="shrink-0 pl-3 text-[16px] text-tekst/30">›</span>
      </button>

      <div className="mt-4 grid grid-cols-7 text-center font-mono text-[10px] tracking-[0.1em] text-tekst/40">
        {WEEKDAGEN.map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>

      <div className="mt-1.5 grid grid-cols-7 gap-y-0.5 text-center text-[15px]">
        {cellen.map((cel) => {
          const heeft = perDatum.has(cel.iso)
          const isVandaag = cel.iso === vandaag
          const isGekozen = cel.iso === gekozen
          return (
            <button
              key={cel.iso}
              type="button"
              onClick={() => setGekozen(cel.iso)}
              className="flex flex-col items-center py-1.5"
            >
              <span
                className={`flex size-8 items-center justify-center rounded-full ${
                  isVandaag
                    ? 'bg-accent font-extrabold text-bg'
                    : isGekozen
                      ? 'border border-white/25'
                      : ''
                } ${!isVandaag && (cel.inMaand ? 'text-tekst/85' : 'text-tekst/25')}`}
              >
                {cel.dag}
              </span>
              <span
                className={`mt-[3px] size-1 rounded-full ${
                  heeft ? (cel.inMaand ? 'bg-accent' : 'bg-accent/35') : 'bg-transparent'
                }`}
              />
            </button>
          )
        })}
      </div>

      <div className="mt-3.5 text-[12px] uppercase tracking-[0.08em] text-tekst/45">
        {gekozen === vandaag ? `Vandaag · ${korteDatum(gekozen)}` : korteDatum(gekozen)}
      </div>

      {vanDeDag.length === 0 ? (
        <div className="kaart mt-2 rounded-[16px] px-4 py-5 text-center text-[13px] text-tekst/40">
          Geen notitie op deze dag.
        </div>
      ) : (
        <div className="mt-2 flex flex-col gap-2">
          {vanDeDag.map((n) => (
            <button key={n.id} type="button" onClick={() => onOpen(n)} className="kaart rounded-[16px] px-4 py-3.5 text-left">
              <div className="flex items-center gap-2">
                <TypeBadge label={TYPE_LABELS[n.type]} />
                <span className="text-[12px] text-tekst/50">
                  {n.duurMinuten ? `${n.duurMinuten} min · ` : ''}energie {n.energie}/5
                </span>
              </div>
              {n.titel && <div className="mt-2 text-[15px] font-bold">{n.titel}</div>}
              <p className="mt-2 line-clamp-2 text-[14px] leading-[1.5] text-tekst/75">{n.tekst}</p>
            </button>
          ))}
        </div>
      )}

      <div className="fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+74px)] z-10 flex justify-center">
        <button
          type="button"
          onClick={onNieuw}
          className="flex items-center gap-2 rounded-full bg-accent px-6 py-3.5 text-[15px] font-extrabold text-bg shadow-[0_8px_30px_rgba(200,245,66,0.25)]"
        >
          <span className="text-[17px]">+</span> Nieuwe notitie
        </button>
      </div>

      <TabBalk
        actief="logboek"
        aantalTaken={openTaken}
        onKies={(tab) => {
          if (tab === 'taken') onTaken()
          if (tab === 'tracking') onTracking()
          if (tab === 'inzicht') onInzicht()
        }}
      />
    </div>
  )
}
