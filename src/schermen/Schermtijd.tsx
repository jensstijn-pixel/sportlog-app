import { useMemo, useState } from 'react'
import type { Schermtijd as SchermtijdType } from '../types'
import { SCHERMTIJD_APPS } from '../types'
import { gisterenISO, korteDatum, nuISO, vandaagISO } from '../lib/datum'
import { Eyebrow, Titel } from '../onderdelen/ui'

/** De cijfers uit Instellingen → Schermtijd overtypen.
 *
 *  Gaat over **gisteren**: 's ochtends is vandaag nog vrijwel leeg, en Apple
 *  toont gisteren als afgeronde dag. Vandaar dat de datum standaard op gisteren
 *  staat en het scherm dat ook zo noemt.
 *
 *  Je vult bruto in plus wat er niet meetelt; netto rekent dit scherm live voor
 *  je uit zodat je meteen ziet of het klopt. De Mac rekent hetzelfde nog een
 *  keer uit over de opgeslagen cijfers — dit is puur terugkoppeling. */

function minutenNaarUren(min: number | null | undefined): { u: string; m: string } {
  if (min == null) return { u: '', m: '' }
  return { u: String(Math.floor(min / 60)), m: String(min % 60).padStart(2, '0') }
}

function getal(tekst: string): number | null {
  const schoon = tekst.replace(',', '.').trim()
  if (!schoon) return null
  const n = Number(schoon)
  return Number.isFinite(n) ? n : null
}

/** Uren + minuten naar één getal. Leeg blijft leeg (null), zodat een niet
 *  ingevulde app iets anders is dan een app die nul minuten aan stond. */
function samen(u: string, m: string): number | null {
  if (!u.trim() && !m.trim()) return null
  return (getal(u) ?? 0) * 60 + (getal(m) ?? 0)
}

function duur(min: number): string {
  const u = Math.floor(min / 60)
  const m = min % 60
  return u ? `${u}u ${String(m).padStart(2, '0')}` : `${m} min`
}

function TijdVeld({
  id,
  label,
  hint,
  uren,
  minuten,
  onUren,
  onMinuten,
}: {
  id: string
  label: string
  hint: string
  uren: string
  minuten: string
  onUren: (v: string) => void
  onMinuten: (v: string) => void
}) {
  return (
    <div className="kaart flex items-center justify-between rounded-[16px] px-4 py-3">
      <div className="min-w-0">
        <label className="block text-[14px] font-semibold" htmlFor={`${id}-uren`}>
          {label}
        </label>
        <p className="mt-0.5 text-[11px] text-tekst/30">{hint}</p>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <input
          id={`${id}-uren`}
          type="number"
          inputMode="numeric"
          min={0}
          max={24}
          value={uren}
          onChange={(e) => onUren(e.target.value)}
          placeholder="0"
          className="w-[52px] rounded-[10px] bg-white/6 px-2 py-2.5 text-center text-[17px] font-bold outline-none focus:bg-white/10"
        />
        <span className="text-[13px] text-tekst/40">u</span>
        <input
          type="number"
          inputMode="numeric"
          min={0}
          max={59}
          value={minuten}
          onChange={(e) => onMinuten(e.target.value)}
          placeholder="00"
          aria-label={`${label}, minuten`}
          className="w-[52px] rounded-[10px] bg-white/6 px-2 py-2.5 text-center text-[17px] font-bold outline-none focus:bg-white/10"
        />
        <span className="text-[13px] text-tekst/40">m</span>
      </div>
    </div>
  )
}

export default function Schermtijd({
  bestaand,
  datum,
  onOpslaan,
  onTerug,
}: {
  bestaand?: SchermtijdType
  datum?: string
  onOpslaan: (s: SchermtijdType) => void
  onTerug: () => void
}) {
  const dag = datum ?? bestaand?.datum ?? gisterenISO()

  const start = useMemo(() => minutenNaarUren(bestaand?.totaalMinuten), [bestaand])
  const [totaalU, setTotaalU] = useState(start.u)
  const [totaalM, setTotaalM] = useState(start.m)

  const [apps, setApps] = useState<Record<string, { u: string; m: string }>>(() => {
    const uit: Record<string, { u: string; m: string }> = {}
    for (const naam of SCHERMTIJD_APPS) uit[naam] = minutenNaarUren(bestaand?.aftrek?.[naam])
    return uit
  })

  const totaal = samen(totaalU, totaalM)
  const aftrek: Record<string, number | null> = {}
  for (const naam of SCHERMTIJD_APPS) aftrek[naam] = samen(apps[naam].u, apps[naam].m)

  const afTotaal = Object.values(aftrek).reduce<number>((t, m) => t + (m ?? 0), 0)
  const netto = totaal == null ? null : Math.max(0, totaal - afTotaal)
  const teVeelAf = totaal != null && afTotaal > totaal

  function opslaan() {
    onOpslaan({ datum: dag, totaalMinuten: totaal, aftrek, bijgewerkt: nuISO() })
  }

  return (
    <div className="min-h-dvh px-5 pt-[calc(env(safe-area-inset-top)+18px)] pb-32">
      <div className="flex items-end justify-between">
        <div>
          <Titel>Schermtijd</Titel>
          <div className="mt-1">
            <Eyebrow>{dag === gisterenISO() ? 'gisteren' : dag === vandaagISO() ? 'vandaag' : korteDatum(dag)}</Eyebrow>
          </div>
        </div>
        <button type="button" onClick={onTerug} className="pb-1 text-[13px] font-semibold text-tekst/50">
          Annuleer
        </button>
      </div>

      <p className="mt-3 text-[13px] leading-[1.5] text-tekst/50">
        Instellingen → Schermtijd → gisteren. Neem het dagtotaal over en daaronder
        de apps die niet als schermtijd tellen.
      </p>

      <div className="kaart mt-4 rounded-[16px] p-4">
        <label className="block text-[13px] font-semibold text-tekst/70" htmlFor="totaal-uren">
          Totaal volgens Apple
        </label>
        <div className="mt-2 flex items-center gap-2">
          <input
            id="totaal-uren"
            type="number"
            inputMode="numeric"
            min={0}
            max={24}
            value={totaalU}
            onChange={(e) => setTotaalU(e.target.value)}
            placeholder="6"
            className="w-16 rounded-[10px] bg-white/6 px-3 py-2.5 text-center text-[17px] font-bold outline-none focus:bg-white/10"
          />
          <span className="text-[14px] text-tekst/45">uur</span>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            max={59}
            value={totaalM}
            onChange={(e) => setTotaalM(e.target.value)}
            placeholder="39"
            aria-label="Totaal, minuten"
            className="w-16 rounded-[10px] bg-white/6 px-3 py-2.5 text-center text-[17px] font-bold outline-none focus:bg-white/10"
          />
          <span className="text-[14px] text-tekst/45">min</span>
        </div>
        <p className="mt-1.5 text-[11px] text-tekst/30">Het cijfer bovenaan het scherm</p>
      </div>

      <div className="mt-4 text-[11px] uppercase tracking-[0.08em] text-tekst/40">
        Telt niet mee
      </div>
      <div className="mt-2 flex flex-col gap-2">
        {SCHERMTIJD_APPS.map((naam) => (
          <TijdVeld
            key={naam}
            id={`app-${naam}`}
            label={naam}
            hint={naam === 'Spotify' ? 'audio, geen scherm' : 'in de auto'}
            uren={apps[naam].u}
            minuten={apps[naam].m}
            onUren={(v) => setApps((a) => ({ ...a, [naam]: { ...a[naam], u: v } }))}
            onMinuten={(v) => setApps((a) => ({ ...a, [naam]: { ...a[naam], m: v } }))}
          />
        ))}
      </div>

      <div className="kaart mt-4 rounded-[16px] px-4 py-4">
        <div className="text-[11px] uppercase tracking-[0.08em] text-tekst/40">
          Netto schermtijd
        </div>
        <div className="mt-1 text-[28px] font-extrabold leading-none">
          {netto == null ? <span className="text-tekst/25">–</span> : duur(netto)}
        </div>
        {totaal != null && afTotaal > 0 && (
          <p className="mt-2 text-[12px] text-tekst/45">
            {duur(totaal)} min {duur(afTotaal)} eraf
          </p>
        )}
        {teVeelAf && (
          <p className="mt-2 text-[12px] font-semibold text-accent">
            De aftrek is groter dan je totaal — even nakijken.
          </p>
        )}
      </div>

      <div className="fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+22px)] z-10 flex justify-center px-5">
        <button
          type="button"
          onClick={opslaan}
          disabled={totaal == null}
          className="w-full max-w-sm rounded-full bg-accent py-3.5 text-[15px] font-extrabold text-bg disabled:opacity-25"
        >
          Opslaan
        </button>
      </div>
    </div>
  )
}
