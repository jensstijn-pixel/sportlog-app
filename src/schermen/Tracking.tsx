import { useMemo, useState } from 'react'
import type { Dataset } from '../types'
import Grafiek, { type Punt } from '../onderdelen/Grafiek'
import { Eyebrow, Pil, TabBalk, Titel } from '../onderdelen/ui'

/** Registratie over tijd: hoe je erbij ligt, wat je tilt, en of het één met
 *  het ander te maken heeft.
 *
 *  Alle cijfers komen doorgerekend van de Mac (scripts/tracking.py). Dit
 *  scherm rekent zelf niets uit — het kiest een periode en tekent. */

const PERIODES = [
  { label: '30 dagen', dagen: 30 },
  { label: '90 dagen', dagen: 90 },
  { label: 'alles', dagen: 3650 },
]

function uren(min: number): string {
  return `${Math.floor(min / 60)}u${String(Math.round(min % 60)).padStart(2, '0')}`
}

export default function Tracking({
  dataset,
  onTerug,
  onTaken,
}: {
  dataset: Dataset | null
  onTerug: () => void
  onTaken: () => void
}) {
  const [dagen, setDagen] = useState(30)
  const [oefening, setOefening] = useState<string | null>(null)

  const grens = useMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() - dagen)
    return d.toISOString().slice(0, 10)
  }, [dagen])

  const herstel = useMemo(
    () => (dataset?.herstel ?? []).filter((h) => h.datum >= grens),
    [dataset, grens],
  )

  const oefeningNamen = useMemo(
    () => Object.keys(dataset?.oefeningen ?? {}).sort(),
    [dataset],
  )
  const actieveOefening = oefening ?? oefeningNamen[0] ?? null
  const oefeningReeks = useMemo(
    () =>
      (actieveOefening ? (dataset?.oefeningen?.[actieveOefening] ?? []) : []).filter(
        (p) => p.datum >= grens,
      ),
    [dataset, actieveOefening, grens],
  )

  const sessies = useMemo(
    () => (dataset?.sessies ?? []).filter((s) => s.datum >= grens),
    [dataset, grens],
  )

  const reeks = (sleutel: 'hrv' | 'slaap_min' | 'readiness' | 'rusthartslag'): Punt[] =>
    herstel.map((h) => ({ datum: h.datum, waarde: h[sleutel] }))

  if (!dataset) {
    return (
      <div className="min-h-dvh px-5 pt-[calc(env(safe-area-inset-top)+18px)] pb-32">
        <Titel>Tracking</Titel>
        <div className="kaart mt-6 rounded-[16px] px-4 py-8 text-center text-[13px] leading-[1.55] text-tekst/45">
          Nog geen gegevens binnen.
          <br />
          De Mac zet ze hier neer bij de eerstvolgende ochtendrun.
        </div>
        <TabBalk actief="tracking" onKies={(t) => (t === 'taken' ? onTaken() : onTerug())} />
      </div>
    )
  }

  const sam = dataset.samenhang

  return (
    <div className="min-h-dvh px-5 pt-[calc(env(safe-area-inset-top)+18px)] pb-32">
      <div className="flex items-end justify-between">
        <div>
          <Titel>Tracking</Titel>
          <div className="mt-1">
            <Eyebrow>{herstel.length} dagen · {sessies.length} trainingen</Eyebrow>
          </div>
        </div>
        <button type="button" onClick={onTerug} className="pb-1 text-[13px] font-semibold text-tekst/50">
          Sluiten
        </button>
      </div>

      {/* Eén filterrij, boven alles wat hij aanstuurt. */}
      <div className="mt-4 flex gap-2">
        {PERIODES.map((p) => (
          <Pil key={p.dagen} actief={dagen === p.dagen} onClick={() => setDagen(p.dagen)} klein>
            {p.label}
          </Pil>
        ))}
      </div>

      <div className="mt-5 text-[12px] uppercase tracking-[0.08em] text-tekst/45">Herstel</div>
      {herstel.length === 0 ? (
        <div className="kaart mt-2 rounded-[16px] px-4 py-6 text-center text-[13px] leading-[1.5] text-tekst/40">
          Nog geen herstelcijfers in deze periode.
          <br />
          Vul ze in bij <span className="text-tekst/60">Vannacht</span>.
        </div>
      ) : (
        <div className="mt-2 flex flex-col gap-2">
          <Grafiek titel="HRV" punten={reeks('hrv')} eenheid="ms" trend />
          <Grafiek
            titel="Slaap"
            punten={reeks('slaap_min')}
            formatteer={uren}
            trend
          />
          <Grafiek titel="Readiness" punten={reeks('readiness')} trend />
          <Grafiek titel="Rusthartslag" punten={reeks('rusthartslag')} eenheid="bpm" hoogGoed={false} trend />
        </div>
      )}

      <div className="mt-6 text-[12px] uppercase tracking-[0.08em] text-tekst/45">Training</div>
      {oefeningNamen.length === 0 ? (
        <div className="kaart mt-2 rounded-[16px] px-4 py-6 text-center text-[13px] text-tekst/40">
          Nog geen trainingsdata.
        </div>
      ) : (
        <>
          <div className="mt-2 -mx-5 flex gap-2 overflow-x-auto px-5 pb-1">
            {oefeningNamen.map((n) => (
              <Pil key={n} actief={n === actieveOefening} onClick={() => setOefening(n)} klein>
                {n}
              </Pil>
            ))}
          </div>
          <div className="mt-2 flex flex-col gap-2">
            <Grafiek
              titel="Geschatte 1RM"
              punten={oefeningReeks.map((p) => ({ datum: p.datum, waarde: p.e1rm }))}
              eenheid="kg"
              formatteer={(n) => String(Math.round(n * 10) / 10).replace('.', ',')}
            />
            <Grafiek
              titel="Volume per sessie"
              punten={oefeningReeks.map((p) => ({ datum: p.datum, waarde: p.volume }))}
              eenheid="kg"
              formatteer={(n) => n.toLocaleString('nl-NL')}
            />
          </div>
          {oefeningReeks.length > 0 && (
            <p className="mt-2 px-1 text-[11px] text-tekst/35">
              Laatst: {oefeningReeks.at(-1)!.top_gewicht} kg × {oefeningReeks.at(-1)!.top_reps} ·{' '}
              {oefeningReeks.at(-1)!.sets} sets
            </p>
          )}
        </>
      )}

      <div className="mt-6 text-[12px] uppercase tracking-[0.08em] text-tekst/45">Samenhang</div>
      <div className="kaart mt-2 rounded-[16px] px-4 py-4">
        <p className="text-[13.5px] leading-[1.55] text-tekst/75">{sam.conclusie}</p>

        {sam.vergelijking && (
          <div className="mt-4">
            {/* Twee groepen, één maat: staafjes met dezelfde hue in twee
                sterktes — het is een ordening (mindere → betere nachten),
                geen identiteit. Waardes staan er los bij, dus kleur draagt
                nooit alleen de betekenis. */}
            {[
              {
                naam: `Na betere nachten (${sam.vergelijking.op} vanaf ${sam.vergelijking.hoog_grens})`,
                waarde: sam.vergelijking.volume_hoog,
                sterk: true,
              },
              {
                naam: `Na mindere (tot ${sam.vergelijking.laag_grens})`,
                waarde: sam.vergelijking.volume_laag,
                sterk: false,
              },
            ].map((rij) => {
              const max = Math.max(sam.vergelijking!.volume_hoog, sam.vergelijking!.volume_laag) || 1
              return (
                <div key={rij.naam} className="mt-2.5 first:mt-0">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-[11.5px] text-tekst/50">{rij.naam}</span>
                    <span className="shrink-0 text-[13px] font-bold tabular-nums">
                      {rij.waarde.toLocaleString('nl-NL')} kg
                    </span>
                  </div>
                  <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-white/6">
                    <div
                      className={`h-full rounded-full ${rij.sterk ? 'bg-accent' : 'bg-accent/35'}`}
                      style={{ width: `${(rij.waarde / max) * 100}%` }}
                    />
                  </div>
                </div>
              )
            })}
            <p className="mt-3 text-[11px] leading-[1.5] text-tekst/35">
              Gemiddeld tilgewicht × reps per training, over {sam.vergelijking.n_per_groep} dagen
              per groep. {!sam.betrouwbaar && 'Nog te weinig data om op te sturen.'}
            </p>
          </div>
        )}

        {sam.n > 0 && !sam.vergelijking && (
          <p className="mt-2 text-[11px] text-tekst/35">
            {sam.n} van de {sam.min_nodig} dagen die ik nodig heb.
          </p>
        )}
      </div>

      <p className="mt-5 px-1 text-[11px] leading-[1.5] text-tekst/25">
        Bijgewerkt {dataset.bijgewerkt.slice(0, 10)}
        {dataset.herstel_bron === 'handmatig' && ' · herstelcijfers handmatig ingevuld'}
      </p>

      <TabBalk actief="tracking" onKies={(t) => (t === 'taken' ? onTaken() : onTerug())} />
    </div>
  )
}
