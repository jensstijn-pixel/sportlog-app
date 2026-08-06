import { useMemo, useState } from 'react'
import type { Herstel as HerstelType } from '../types'
import { korteDatum, nuISO, vandaagISO } from '../lib/datum'
import { Eyebrow, Titel } from '../onderdelen/ui'

/** De cijfers uit de Oura-app overtypen.
 *
 *  Tijdelijk, tot de API-koppeling werkt: die levert straks exact dezelfde
 *  velden. Daarom is het formaat hier al gelijk aan wat de API teruggeeft —
 *  dan verandert er later niets aan de brief of de duiding.
 *
 *  Alles mag leeg blijven. Een half ingevulde dag is nuttiger dan geen dag,
 *  en de duiding op de Mac slaat ontbrekende waardes gewoon over. */

interface Veld {
  sleutel: keyof Omit<HerstelType, 'datum' | 'bijgewerkt'>
  label: string
  hint: string
  eenheid?: string
  stap?: string
  min?: number
  max?: number
}

const VELDEN: Veld[] = [
  { sleutel: 'readiness', label: 'Readiness', hint: 'startscherm', min: 0, max: 100 },
  { sleutel: 'slaapScore', label: 'Slaapscore', hint: 'startscherm', min: 0, max: 100 },
  { sleutel: 'hrv', label: 'HRV', hint: 'Slaap → Average HRV', eenheid: 'ms', min: 0, max: 250 },
  {
    sleutel: 'rusthartslag',
    label: 'Rusthartslag',
    hint: 'Slaap → laagste',
    eenheid: 'bpm',
    min: 25,
    max: 120,
  },
  {
    sleutel: 'tempAfwijking',
    label: 'Temperatuur',
    hint: 'afwijking, mag negatief',
    eenheid: '°C',
    stap: '0.1',
    min: -5,
    max: 5,
  },
]

function minutenNaarUren(min: number | null): { u: string; m: string } {
  if (min == null) return { u: '', m: '' }
  return { u: String(Math.floor(min / 60)), m: String(min % 60).padStart(2, '0') }
}

export default function Herstel({
  bestaand,
  datum,
  onOpslaan,
  onTerug,
}: {
  bestaand?: HerstelType
  datum?: string
  onOpslaan: (h: HerstelType) => void
  onTerug: () => void
}) {
  const dag = datum ?? bestaand?.datum ?? vandaagISO()
  const start = useMemo(() => minutenNaarUren(bestaand?.slaapMinuten ?? null), [bestaand])

  const [uren, setUren] = useState(start.u)
  const [minuten, setMinuten] = useState(start.m)
  const [waardes, setWaardes] = useState<Record<string, string>>(() => {
    const uit: Record<string, string> = {}
    for (const v of VELDEN) {
      const w = bestaand?.[v.sleutel]
      uit[v.sleutel] = w == null ? '' : String(w)
    }
    return uit
  })

  function getal(tekst: string): number | null {
    const schoon = tekst.replace(',', '.').trim()
    if (!schoon) return null
    const n = Number(schoon)
    return Number.isFinite(n) ? n : null
  }

  const slaapMinuten =
    uren.trim() || minuten.trim()
      ? (getal(uren) ?? 0) * 60 + (getal(minuten) ?? 0)
      : null

  const ietsIngevuld =
    slaapMinuten != null || VELDEN.some((v) => getal(waardes[v.sleutel]) != null)

  function opslaan() {
    onOpslaan({
      datum: dag,
      slaapMinuten,
      slaapScore: getal(waardes.slaapScore),
      readiness: getal(waardes.readiness),
      hrv: getal(waardes.hrv),
      rusthartslag: getal(waardes.rusthartslag),
      tempAfwijking: getal(waardes.tempAfwijking),
      bijgewerkt: nuISO(),
    })
  }

  return (
    <div className="min-h-dvh px-5 pt-[calc(env(safe-area-inset-top)+18px)] pb-32">
      <div className="flex items-end justify-between">
        <div>
          <Titel>Vannacht</Titel>
          <div className="mt-1">
            <Eyebrow>{dag === vandaagISO() ? 'vandaag' : korteDatum(dag)}</Eyebrow>
          </div>
        </div>
        <button type="button" onClick={onTerug} className="pb-1 text-[13px] font-semibold text-tekst/50">
          Annuleer
        </button>
      </div>

      <p className="mt-3 text-[13px] leading-[1.5] text-tekst/50">
        Neem over wat de Oura-app laat zien. Alles mag leeg blijven — wat je invult
        telt mee, de rest slaat de brief over.
      </p>

      <div className="kaart mt-4 rounded-[16px] p-4">
        <label className="block text-[13px] font-semibold text-tekst/70" htmlFor="slaap-uren">
          Slaap
        </label>
        <div className="mt-2 flex items-center gap-2">
          <input
            id="slaap-uren"
            type="number"
            inputMode="numeric"
            min={0}
            max={16}
            value={uren}
            onChange={(e) => setUren(e.target.value)}
            placeholder="7"
            className="w-16 rounded-[10px] bg-white/6 px-3 py-2.5 text-center text-[17px] font-bold outline-none focus:bg-white/10"
          />
          <span className="text-[14px] text-tekst/45">uur</span>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            max={59}
            value={minuten}
            onChange={(e) => setMinuten(e.target.value)}
            placeholder="12"
            aria-label="Slaap, minuten"
            className="w-16 rounded-[10px] bg-white/6 px-3 py-2.5 text-center text-[17px] font-bold outline-none focus:bg-white/10"
          />
          <span className="text-[14px] text-tekst/45">min</span>
        </div>
        <p className="mt-1.5 text-[11px] text-tekst/30">Slaap → Total sleep</p>
      </div>

      <div className="mt-2 flex flex-col gap-2">
        {VELDEN.map((v) => (
          <div key={v.sleutel} className="kaart flex items-center justify-between rounded-[16px] px-4 py-3">
            <div className="min-w-0">
              <label className="block text-[14px] font-semibold" htmlFor={`veld-${v.sleutel}`}>
                {v.label}
              </label>
              <p className="mt-0.5 text-[11px] text-tekst/30">{v.hint}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <input
                id={`veld-${v.sleutel}`}
                type="number"
                inputMode="decimal"
                step={v.stap ?? '1'}
                min={v.min}
                max={v.max}
                value={waardes[v.sleutel]}
                onChange={(e) => setWaardes((w) => ({ ...w, [v.sleutel]: e.target.value }))}
                placeholder="–"
                className="w-[86px] rounded-[10px] bg-white/6 px-3 py-2.5 text-center text-[17px] font-bold outline-none focus:bg-white/10"
              />
              {v.eenheid && (
                <span className="w-8 text-[13px] text-tekst/40">{v.eenheid}</span>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+22px)] z-10 flex justify-center px-5">
        <button
          type="button"
          onClick={opslaan}
          disabled={!ietsIngevuld}
          className="w-full max-w-sm rounded-full bg-accent py-3.5 text-[15px] font-extrabold text-bg disabled:opacity-25"
        >
          Opslaan
        </button>
      </div>
    </div>
  )
}
