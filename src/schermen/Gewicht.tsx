import { useState } from 'react'
import type { Gewicht as GewichtType } from '../types'
import { gewichtGemiddelden } from '../types'
import { korteDatum, nuISO, vandaagISO } from '../lib/datum'
import { Eyebrow, Titel } from '../onderdelen/ui'

/** Het ochtendgewicht invullen.
 *
 *  Eén getal per dag. Het scherm laat meteen het 7-daagse gemiddelde zien,
 *  zodat de losse dag niet het verhaal wordt: een kilo erbij na een zoute
 *  avond is vocht, geen vet. */

function kgTekst(kg: number): string {
  return kg.toFixed(1).replace('.', ',')
}

export default function Gewicht({
  bestaand,
  alles,
  datum,
  onOpslaan,
  onTerug,
}: {
  bestaand?: GewichtType
  alles: Record<string, GewichtType>
  datum?: string
  onOpslaan: (g: GewichtType) => void
  onTerug: () => void
}) {
  const dag = datum ?? bestaand?.datum ?? vandaagISO()
  const [tekst, setTekst] = useState(bestaand ? kgTekst(bestaand.kg) : '')

  const schoon = tekst.replace(',', '.').trim()
  const n = schoon ? Number(schoon) : NaN
  // Ruime grenzen: alleen tikfouten tegenhouden (9,4 of 944).
  const kg = Number.isFinite(n) && n >= 40 && n <= 200 ? Math.round(n * 10) / 10 : null

  // Laat zien wat het gemiddelde wordt mét deze meting erbij.
  const metDeze = kg == null ? alles : { ...alles, [dag]: { datum: dag, kg, bijgewerkt: '' } }
  const { deze, vorige } = gewichtGemiddelden(metDeze, dag)
  const verschil = deze != null && vorige != null ? deze - vorige : null

  function opslaan() {
    if (kg == null) return
    onOpslaan({ datum: dag, kg, bijgewerkt: nuISO() })
  }

  return (
    <div className="min-h-dvh px-5 pt-[calc(env(safe-area-inset-top)+18px)] pb-32">
      <div className="flex items-end justify-between">
        <div>
          <Titel>Gewicht</Titel>
          <div className="mt-1">
            <Eyebrow>{dag === vandaagISO() ? 'vanochtend' : korteDatum(dag)}</Eyebrow>
          </div>
        </div>
        <button type="button" onClick={onTerug} className="pb-1 text-[13px] font-semibold text-tekst/50">
          Annuleer
        </button>
      </div>

      <p className="mt-3 text-[13px] leading-[1.5] text-tekst/50">
        Na het toilet, vóór eten en drinken. Kijk naar het weekgemiddelde, niet naar
        de dag.
      </p>

      <div className="kaart mt-4 rounded-[16px] p-4">
        <label className="block text-[13px] font-semibold text-tekst/70" htmlFor="gewicht-kg">
          Weegschaal
        </label>
        <div className="mt-2 flex items-center gap-2">
          <input
            id="gewicht-kg"
            type="text"
            inputMode="decimal"
            value={tekst}
            onChange={(e) => setTekst(e.target.value)}
            placeholder="00,0"
            className="w-28 rounded-[10px] bg-white/6 px-3 py-2.5 text-center text-[17px] font-bold outline-none focus:bg-white/10"
          />
          <span className="text-[14px] text-tekst/45">kg</span>
        </div>
        {schoon && kg == null && (
          <p className="mt-2 text-[12px] font-semibold text-accent">Dat lijkt een tikfout.</p>
        )}
      </div>

      <div className="kaart mt-4 rounded-[16px] px-4 py-4">
        <div className="text-[11px] uppercase tracking-[0.08em] text-tekst/40">
          Gemiddelde afgelopen 7 dagen
        </div>
        <div className="mt-1 text-[28px] font-extrabold leading-none">
          {deze == null ? <span className="text-tekst/25">–</span> : `${kgTekst(deze)} kg`}
        </div>
        {verschil != null && (
          <p className="mt-2 text-[12px] text-tekst/45">
            {verschil <= 0 ? '−' : '+'}
            {kgTekst(Math.abs(verschil))} kg t.o.v. de 7 dagen ervoor
          </p>
        )}
        <p className="mt-3 text-[11px] leading-[1.45] text-tekst/30">
          {deze == null
            ? 'Vanaf 3 wegingen in een week verschijnt hier een gemiddelde.'
            : 'Doel: 0,3 tot 0,8 kg per week eraf. Daarbuiten stellen we de kcal bij.'}
        </p>
      </div>

      <div className="fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+22px)] z-10 flex justify-center px-5">
        <button
          type="button"
          onClick={opslaan}
          disabled={kg == null}
          className="w-full max-w-sm rounded-full bg-accent py-3.5 text-[15px] font-extrabold text-bg disabled:opacity-25"
        >
          Opslaan
        </button>
      </div>
    </div>
  )
}
