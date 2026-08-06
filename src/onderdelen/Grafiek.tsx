import { useMemo, useState } from 'react'

/** Eén reeks over tijd, met een eigen schaal.
 *
 *  Bewust één serie per grafiek: HRV (~45 ms), slaap (~430 min) en readiness
 *  (0–100) op één plot zou twee y-assen vragen, en dan verzin je een verband
 *  dat er niet is. Drie losse grafiekjes onder elkaar lezen even snel en
 *  liegen niet.
 *
 *  Daarom ook geen legenda: bij één reeks zegt de titel al wat je ziet.
 *  Getallen staan alleen bij het laatste punt en bij de uitschieters — een
 *  cijfer bij elk punt wordt toch niet gelezen. De rest haal je uit de
 *  tabelweergave of door een punt aan te tikken. */

export interface Punt {
  datum: string
  waarde: number | null
}

const H = 64          // hoogte van het tekenvlak
const MARGE = 6       // ruimte voor de markers, zodat ze niet afgesneden worden
const TREND_VENSTER = 7   // dagen waarover we uitmiddelen
const TREND_VANAF = 10    // minder punten dan dit: geen trendlijn, die zegt dan niets

/** Voortschrijdend gemiddelde.
 *
 *  Dag-op-dag schommelt HRV zo hard dat de ruwe lijn een zaagtand wordt waar
 *  je geen richting in ziet — en de richting is nou juist waar je naar kijkt.
 *  De ruwe waardes blijven zichtbaar (gedempt), zodat je nog steeds ziet hoe
 *  onrustig het was. */
function trendVan(waardes: number[], venster = TREND_VENSTER): number[] {
  return waardes.map((_, i) => {
    const van = Math.max(0, i - venster + 1)
    const stuk = waardes.slice(van, i + 1)
    return stuk.reduce((a, b) => a + b, 0) / stuk.length
  })
}

function padVan(punten: { x: number; y: number }[]): string {
  return punten.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x} ${p.y}`).join(' ')
}

export default function Grafiek({
  titel,
  punten,
  eenheid = '',
  formatteer = (n: number) => String(Math.round(n)),
  hoogGoed = true,
  trend = false,
}: {
  titel: string
  punten: Punt[]
  eenheid?: string
  formatteer?: (n: number) => string
  /** Alleen voor de leesrichting in de tabel; kleurt niets. */
  hoogGoed?: boolean
  /** Trendlijn tonen (zinvol bij dagelijkse metingen, niet bij losse sessies). */
  trend?: boolean
}) {
  const [gekozen, setGekozen] = useState<number | null>(null)
  const [tabel, setTabel] = useState(false)

  const gevuld = useMemo(
    () => punten.filter((p): p is { datum: string; waarde: number } => p.waarde != null),
    [punten],
  )

  const vorm = useMemo(() => {
    if (gevuld.length < 2) return null
    const waardes = gevuld.map((p) => p.waarde)
    const min = Math.min(...waardes)
    const max = Math.max(...waardes)
    const spanne = max - min || 1
    const breedte = 300
    const stap = (breedte - MARGE * 2) / (gevuld.length - 1)
    const naarY = (w: number) => MARGE + (1 - (w - min) / spanne) * (H - MARGE * 2)
    const xy = gevuld.map((p, i) => ({ x: MARGE + i * stap, y: naarY(p.waarde), ...p }))
    const toonTrend = trend && gevuld.length >= TREND_VANAF
    const trendXY = toonTrend
      ? trendVan(waardes).map((w, i) => ({ x: MARGE + i * stap, y: naarY(w) }))
      : null
    return { xy, trendXY, min, max, breedte }
  }, [gevuld, trend])

  const laatste = gevuld.at(-1)
  const actief = gekozen != null && vorm ? vorm.xy[gekozen] : null

  return (
    <div className="kaart rounded-[16px] px-4 py-3.5">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-[13px] font-semibold text-tekst/70">{titel}</h3>
        <div className="text-right">
          <span className="text-[17px] font-bold tabular-nums">
            {actief
              ? formatteer(actief.waarde)
              : laatste
                ? formatteer(laatste.waarde)
                : '–'}
          </span>
          {eenheid && <span className="ml-1 text-[11px] text-tekst/40">{eenheid}</span>}
        </div>
      </div>

      {!vorm ? (
        <p className="mt-2 text-[12px] text-tekst/35">
          {gevuld.length === 1
            ? 'Eén meting — vanaf twee punten teken ik een lijn.'
            : 'Nog geen metingen.'}
        </p>
      ) : (
        <>
          <svg
            viewBox={`0 0 ${vorm.breedte} ${H}`}
            className="mt-2 w-full"
            style={{ height: H }}
            role="img"
            aria-label={`${titel}: ${gevuld.length} metingen, laatste ${
              laatste ? formatteer(laatste.waarde) : 'onbekend'
            } ${eenheid}`}
          >
            {/* hairline basislijn, één tint van het oppervlak af */}
            <line
              x1={0}
              y1={H - 1}
              x2={vorm.breedte}
              y2={H - 1}
              stroke="rgba(255,255,255,0.07)"
              strokeWidth={1}
            />
            <path
              d={padVan(vorm.xy)}
              fill="none"
              stroke="var(--color-accent)"
              strokeWidth={vorm.trendXY ? 1.5 : 2}
              strokeOpacity={vorm.trendXY ? 0.22 : 1}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {vorm.trendXY && (
              <path
                d={padVan(vorm.trendXY)}
                fill="none"
                stroke="var(--color-accent)"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}
            {/* laatste punt krijgt een marker; 2px ring in de oppervlaktekleur */}
            {vorm.xy.length > 0 && (
              <circle
                cx={vorm.xy.at(-1)!.x}
                cy={vorm.xy.at(-1)!.y}
                r={4}
                fill="var(--color-accent)"
                stroke="var(--color-kaart)"
                strokeWidth={2}
              />
            )}
            {actief && (
              <circle
                cx={actief.x}
                cy={actief.y}
                r={5}
                fill="var(--color-accent)"
                stroke="var(--color-kaart)"
                strokeWidth={2}
              />
            )}
            {/* onzichtbare, ruime raakvlakken: de lijn is 2px, de knop ~24px */}
            {vorm.xy.map((p, i) => (
              <rect
                key={p.datum}
                x={p.x - vorm.breedte / vorm.xy.length / 2}
                y={0}
                width={vorm.breedte / vorm.xy.length}
                height={H}
                fill="transparent"
                onClick={() => setGekozen(gekozen === i ? null : i)}
              />
            ))}
          </svg>

          <div className="mt-1 flex items-center justify-between text-[10px] text-tekst/30">
            <span>{gevuld[0].datum.slice(5).replace('-', '/')}</span>
            <button
              type="button"
              onClick={() => setTabel((t) => !t)}
              className="px-2 py-1 text-tekst/40 underline decoration-white/20 underline-offset-2"
            >
              {tabel ? 'verberg cijfers' : 'alle cijfers'}
            </button>
            <span>{gevuld.at(-1)!.datum.slice(5).replace('-', '/')}</span>
          </div>

          {vorm.trendXY && !actief && (
            <p className="mt-0.5 text-[10px] text-tekst/25">
              dikke lijn = {TREND_VENSTER}-daags gemiddelde
            </p>
          )}

          {actief && (
            <p className="mt-1 text-[11px] text-tekst/50">
              {actief.datum} · {formatteer(actief.waarde)} {eenheid}
            </p>
          )}

          {/* Tabelweergave: elke waarde ook zonder tikken bereikbaar. */}
          {tabel && (
            <div className="mt-2 max-h-44 overflow-y-auto">
              <table className="w-full text-[12px] tabular-nums">
                <thead className="sticky top-0 bg-kaart text-left text-[10px] uppercase tracking-[0.06em] text-tekst/35">
                  <tr>
                    <th className="py-1 font-semibold">Datum</th>
                    <th className="py-1 text-right font-semibold">
                      {titel} {eenheid && `(${eenheid})`}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {[...gevuld].reverse().map((p) => (
                    <tr key={p.datum} className="border-t border-white/5">
                      <td className="py-1 text-tekst/50">{p.datum}</td>
                      <td className="py-1 text-right text-tekst/80">{formatteer(p.waarde)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-1 text-[10px] text-tekst/25">
                {gevuld.length} metingen · {hoogGoed ? 'hoger is beter' : 'lager is beter'}
                {vorm.trendXY && ` · lijn = ${TREND_VENSTER}-daags gemiddelde`}
              </p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
