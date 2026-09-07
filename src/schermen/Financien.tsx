import { useMemo, useRef, useState } from 'react'
import type { FinancienDuiding, Post, Richting } from '../types'
import { korteDatum, vandaagISO } from '../lib/datum'
import { Eyebrow, TabBalk, Titel } from '../onderdelen/ui'

/** Geld erin en eruit, met je eigen uitleg erbij.
 *
 *  Alleen privé: zakelijk loopt via Moneybird. De uitleg is het punt van dit
 *  scherm, niet het bedrag — "40 euro materiaal voor PT" is iets wat geen
 *  bankafschrift je kan vertellen, en het is precies wat de ochtendbrief nodig
 *  heeft om er 's ochtends iets zinnigs over te zeggen.
 *
 *  Invoeren moet in tien seconden kunnen, staand in een keuken: bedrag, twee
 *  woorden, opslaan. Alles daarna is terugkijken. */

const MAANDEN = [
  'januari', 'februari', 'maart', 'april', 'mei', 'juni',
  'juli', 'augustus', 'september', 'oktober', 'november', 'december',
]

/** "12,50" of "12.5" of "12" naar centen. Geeft null bij onzin, zodat de knop
 *  uit blijft in plaats van dat er een rare post ontstaat. */
export function naarCent(tekst: string): number | null {
  const schoon = tekst.replace(/\s|€/g, '').replace(',', '.')
  if (!schoon || !/^\d*\.?\d*$/.test(schoon)) return null
  const n = Number(schoon)
  if (!Number.isFinite(n) || n <= 0) return null
  return Math.round(n * 100)
}

/** Centen naar "12,50". Zonder euroteken: dat zet de opmaak eromheen. */
export function euro(cent: number): string {
  return (cent / 100).toFixed(2).replace('.', ',')
}

function maandSleutel(iso: string): string {
  return iso.slice(0, 7)
}

function maandLabel(sleutel: string): string {
  const [jaar, maand] = sleutel.split('-')
  return `${MAANDEN[Number(maand) - 1]} ${jaar}`
}

export default function Financien({
  posten,
  duiding,
  onToevoegen,
  onVerwijder,
  onTerug,
  onTaken,
  onTracking,
  onInzicht,
}: {
  posten: Post[]
  duiding: FinancienDuiding | null
  onToevoegen: (post: { datum: string; bedragCent: number; richting: Richting; tekst: string }) => void
  onVerwijder: (id: string) => void
  onTerug: () => void
  onTaken: () => void
  onTracking: () => void
  onInzicht: () => void
}) {
  const [richting, setRichting] = useState<Richting>('af')
  const [bedrag, setBedrag] = useState('')
  const [tekst, setTekst] = useState('')
  const [datum, setDatum] = useState(vandaagISO())
  const [toonDatum, setToonDatum] = useState(false)
  const bedragVeld = useRef<HTMLInputElement>(null)

  const cent = naarCent(bedrag)
  const kanOpslaan = cent !== null && tekst.trim().length > 0

  const dezeMaand = maandSleutel(vandaagISO())

  const { maandUit, maandIn, perDag, maandenBeschikbaar } = useMemo(() => {
    const vanDeMaand = posten.filter((p) => maandSleutel(p.datum) === dezeMaand)
    const maandUit = vanDeMaand
      .filter((p) => p.richting === 'af')
      .reduce((som, p) => som + p.bedragCent, 0)
    const maandIn = vanDeMaand
      .filter((p) => p.richting === 'bij')
      .reduce((som, p) => som + p.bedragCent, 0)

    // Groeperen per dag houdt de lijst leesbaar zodra er meerdere posten per
    // dag zijn; de datumkop staat er dan één keer in plaats van bij elke regel.
    const perDag = new Map<string, Post[]>()
    for (const p of posten) {
      const rij = perDag.get(p.datum)
      if (rij) rij.push(p)
      else perDag.set(p.datum, [p])
    }
    const maandenBeschikbaar = new Set(posten.map((p) => maandSleutel(p.datum))).size
    return { maandUit, maandIn, perDag, maandenBeschikbaar }
  }, [posten, dezeMaand])

  const saldo = maandIn - maandUit

  function voegToe() {
    if (cent === null || !tekst.trim()) return
    onToevoegen({ datum, bedragCent: cent, richting, tekst: tekst.trim() })
    setBedrag('')
    setTekst('')
    setDatum(vandaagISO())
    setToonDatum(false)
    bedragVeld.current?.focus()
  }

  return (
    <div className="mx-auto max-w-md px-4 pb-28 pt-6">
      <Eyebrow>Geld</Eyebrow>
      <Titel>Erin en eruit</Titel>

      <div className="kaart mt-4 rounded-[20px] p-4">
        <div className="flex gap-2" role="group" aria-label="Erbij of eraf">
          {(['af', 'bij'] as Richting[]).map((r) => (
            <button
              key={r}
              type="button"
              aria-pressed={richting === r}
              onClick={() => setRichting(r)}
              className={`flex-1 rounded-[14px] py-2.5 text-[15px] font-bold transition ${
                richting === r
                  ? r === 'af'
                    ? 'bg-tekst/90 text-bg'
                    : 'bg-accent text-bg'
                  : 'bg-white/5 text-tekst/45'
              }`}
            >
              {r === 'af' ? '− eraf' : '+ erbij'}
            </button>
          ))}
        </div>

        <div className="mt-3 flex items-center gap-2">
          <span className="text-[26px] font-bold text-tekst/35" aria-hidden="true">
            €
          </span>
          <input
            ref={bedragVeld}
            type="text"
            inputMode="decimal"
            autoComplete="off"
            aria-label="Bedrag in euro"
            placeholder="0,00"
            value={bedrag}
            onChange={(e) => setBedrag(e.target.value)}
            className="w-full bg-transparent text-[30px] font-bold tabular-nums outline-none placeholder:text-tekst/20"
          />
        </div>

        <input
          type="text"
          aria-label="Wat was het, en waarvoor"
          placeholder="Wat was het? Bijv. boodschappen Jumbo"
          value={tekst}
          onChange={(e) => setTekst(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && kanOpslaan) voegToe()
          }}
          className="mt-2 w-full rounded-[14px] bg-white/5 px-3 py-2.5 text-[15px] outline-none placeholder:text-tekst/25"
        />

        <div className="mt-3 flex items-center justify-between gap-2">
          {toonDatum ? (
            <input
              type="date"
              aria-label="Datum"
              value={datum}
              max={vandaagISO()}
              onChange={(e) => setDatum(e.target.value || vandaagISO())}
              className="rounded-[12px] bg-white/5 px-2.5 py-1.5 text-[13px] outline-none"
            />
          ) : (
            <button
              type="button"
              onClick={() => setToonDatum(true)}
              className="rounded-[12px] px-1 py-1.5 text-[13px] text-tekst/40 underline decoration-tekst/20 underline-offset-2"
            >
              {datum === vandaagISO() ? 'Vandaag' : korteDatum(datum)} · aanpassen
            </button>
          )}
          <button
            type="button"
            disabled={!kanOpslaan}
            onClick={voegToe}
            className="rounded-[14px] bg-accent px-5 py-2.5 text-[15px] font-bold text-bg disabled:bg-white/10 disabled:text-tekst/25"
          >
            Bewaren
          </button>
        </div>
      </div>

      <section className="mt-6" aria-label={`Overzicht ${maandLabel(dezeMaand)}`}>
        <Eyebrow>{maandLabel(dezeMaand)}</Eyebrow>
        <div className="kaart mt-2 grid grid-cols-3 gap-1 rounded-[18px] px-3 py-3 text-center">
          <div>
            <p className="text-[11px] text-tekst/35">Eruit</p>
            <p className="mt-0.5 text-[17px] font-bold tabular-nums">€ {euro(maandUit)}</p>
          </div>
          <div>
            <p className="text-[11px] text-tekst/35">Erin</p>
            <p className="mt-0.5 text-[17px] font-bold tabular-nums text-accent">
              € {euro(maandIn)}
            </p>
          </div>
          <div>
            <p className="text-[11px] text-tekst/35">Verschil</p>
            <p
              className={`mt-0.5 text-[17px] font-bold tabular-nums ${
                saldo < 0 ? 'text-tekst' : 'text-accent'
              }`}
            >
              {saldo < 0 ? '−' : '+'} € {euro(Math.abs(saldo))}
            </p>
          </div>
        </div>
        {maandenBeschikbaar < 2 && posten.length > 0 && !duiding?.vaste_lasten.length && (
          <p className="mt-2 px-1 text-[11px] leading-snug text-tekst/30">
            Nog één maand aan posten. Vergelijken met vorige maanden en vaste lasten herkennen
            kan pas als er meer in staat.
          </p>
        )}
      </section>

      {duiding && duiding.vaste_lasten.length > 0 && (
        <section className="mt-6" aria-label="Vaste lasten">
          <Eyebrow>Komt elke maand terug</Eyebrow>
          <ul className="kaart mt-2 divide-y divide-white/5 rounded-[18px] px-3">
            {duiding.vaste_lasten.map((v) => (
              <li key={v.tekst} className="flex items-baseline justify-between gap-3 py-2.5">
                <span className="min-w-0 truncate text-[14px]">{v.tekst}</span>
                <span className="shrink-0 text-[14px] font-semibold tabular-nums text-tekst/60">
                  € {euro(v.bedragCent)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-6" aria-label="Alle posten">
        <Eyebrow>Alles</Eyebrow>
        {posten.length === 0 ? (
          <p className="mt-3 px-1 text-[14px] leading-relaxed text-tekst/35">
            Nog niets ingevoerd. Zet erin wat je uitgeeft, met in een paar woorden waar het
            voor was. Dat laatste is waar de ochtendbrief mee werkt.
          </p>
        ) : (
          <div className="mt-2 space-y-4">
            {[...perDag.entries()].map(([dag, rij]) => (
              <div key={dag}>
                <p className="px-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-tekst/30">
                  {dag === vandaagISO() ? 'Vandaag' : korteDatum(dag)}
                </p>
                <ul className="kaart mt-1.5 divide-y divide-white/5 rounded-[18px] px-3">
                  {rij.map((p) => (
                    <li key={p.id} className="flex items-center gap-3 py-2.5">
                      <span className="min-w-0 flex-1 truncate text-[14px]">{p.tekst}</span>
                      <span
                        className={`shrink-0 text-[15px] font-bold tabular-nums ${
                          p.richting === 'bij' ? 'text-accent' : 'text-tekst/85'
                        }`}
                      >
                        {p.richting === 'af' ? '−' : '+'} € {euro(p.bedragCent)}
                      </span>
                      <button
                        type="button"
                        onClick={() => onVerwijder(p.id)}
                        aria-label={`Verwijder ${p.tekst}`}
                        className="shrink-0 px-1 text-[15px] leading-none text-tekst/25"
                      >
                        ×
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>

      <TabBalk
        actief="financien"
        onKies={(tab) => {
          if (tab === 'logboek') onTerug()
          if (tab === 'taken') onTaken()
          if (tab === 'tracking') onTracking()
          if (tab === 'inzicht') onInzicht()
        }}
      />
    </div>
  )
}
