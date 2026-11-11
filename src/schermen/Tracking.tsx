import { useMemo, useState } from 'react'
import type { Dataset, Gewicht, Weekoverzicht } from '../types'
import { gewichtGemiddelden } from '../types'
import Grafiek, { type Punt } from '../onderdelen/Grafiek'
import { AiKaart, Kaart, KeuzeChips, PaginaKop, Sectiekop, TabBalk } from '../onderdelen/ui'
import { euro } from '../lib/geld'
import { vandaagISO } from '../lib/datum'

/** Wat er over tijd gebeurt: gewicht, herstel, schermtijd en geld.
 *
 *  **Oefeningen staan hier bewust niet meer** (besluit Jens, 7 sep 2026): zijn
 *  sets en gewichten houdt Hevy al bij, en die app doet dat beter. Wat hier wél
 *  hoort is alles waar geen andere app voor is.
 *
 *  De samenhang tussen herstel en prestatie blijft wel, want dat is de enige
 *  conclusie die twee bronnen combineert en die je nergens anders krijgt. */

type Periode = '30' | '90' | 'alles'

export default function Tracking({
  dataset,
  gewicht,
  weekoverzicht,
  onTab,
}: {
  dataset: Dataset | null
  gewicht: Record<string, Gewicht>
  weekoverzicht?: Weekoverzicht
  onTab: (tab: 'vandaag' | 'logboek') => void
}) {
  const [periode, setPeriode] = useState<Periode>('30')

  const grens = useMemo(() => {
    if (periode === 'alles') return '0000-01-01'
    const d = new Date()
    d.setDate(d.getDate() - Number(periode))
    return d.toISOString().slice(0, 10)
  }, [periode])

  /** Uitgaven per week (ma–zo) uit het ABN-afschrift; de Mac rekent ze uit
   *  (tracking.py). Potjes, beleggen en zakelijk tellen niet mee. Per week en
   *  niet per dag: het afschrift komt één keer per week binnen. */
  const geldWeken = useMemo(
    () => (dataset?.geld_weken ?? []).filter((w) => w.datum >= grens),
    [dataset, grens],
  )
  const geldPunten = useMemo<Punt[]>(
    () => geldWeken.map((w) => ({ datum: w.datum, waarde: w.uit / 100 })),
    [geldWeken],
  )
  const gemiddeldPerWeek = geldWeken.length
    ? Math.round(geldWeken.reduce((s, w) => s + w.uit, 0) / geldWeken.length)
    : 0

  /** Gewicht komt rechtstreeks uit de app, niet via de Mac: dan staat de
   *  meting van vanochtend er meteen in. */
  const gewichtPunten = useMemo<Punt[]>(
    () =>
      Object.values(gewicht)
        .filter((g) => g.datum >= grens)
        .sort((a, b) => (a.datum < b.datum ? -1 : 1))
        .map((g) => ({ datum: g.datum, waarde: g.kg })),
    [gewicht, grens],
  )
  const { deze: gemDeze, vorige: gemVorige } = gewichtGemiddelden(gewicht, vandaagISO())
  const kg = (n: number) => n.toFixed(1).replace('.', ',')

  const samenhang = dataset?.samenhang
  const dagenMetData = dataset?.herstel?.length ?? 0

  return (
    <div className="px-5 pt-[calc(env(safe-area-inset-top)+26px)] pb-28">
      <PaginaKop
        titel="Tracking"
        onder={
          dagenMetData
            ? `${dagenMetData} dagen · ${dataset?.geld_weken?.length ?? 0} geldweken`
            : 'Nog geen gegevens'
        }
      />

      <div className="mt-[18px]">
        <KeuzeChips
          waarde={periode}
          opties={[
            { waarde: '30' as Periode, label: '30 dagen' },
            { waarde: '90' as Periode, label: '90 dagen' },
            { waarde: 'alles' as Periode, label: 'alles' },
          ]}
          onKies={setPeriode}
        />
      </div>

      <Sectiekop className="mt-6">Gewicht</Sectiekop>
      <div className="mt-2.5 grid grid-cols-1 gap-2.5">
        <Grafiek titel="Ochtendgewicht" punten={gewichtPunten} eenheid="kg" formatteer={kg} hoogGoed={false} trend />
        <Kaart className="flex items-baseline justify-between px-4 py-3.5">
          <span className="text-[15px] font-semibold">Gemiddeld afgelopen 7 dagen</span>
          <span className="text-right">
            <span className="text-[20px] font-bold tabular-nums">{gemDeze != null ? `${kg(gemDeze)} kg` : '–'}</span>
            {gemDeze != null && gemVorige != null && (
              <span className="block text-[12px] text-vaag">
                {gemDeze - gemVorige <= 0 ? '−' : '+'}
                {kg(Math.abs(gemDeze - gemVorige))} kg t.o.v. week ervoor
              </span>
            )}
          </span>
        </Kaart>
      </div>

      {/* Herstel staat sinds 11 nov 2026 op de pagina Herstel van het dashboard (grafiek per dag,
          met 7-daags gemiddelde). Hier blijft alleen de samenhang met je training. */}

      <Sectiekop className="mt-6">Geld</Sectiekop>
      <div className="mt-2.5 grid grid-cols-1 gap-2.5">
        {geldPunten.length >= 2 ? (
          <Grafiek
            titel="Uitgaven per week"
            punten={geldPunten}
            eenheid="€"
            formatteer={(n) => euro(Math.round(n * 100))}
            hoogGoed={false}
            trend
          />
        ) : (
          <Kaart className="px-4 py-3.5">
            <p className="text-[14px] text-vaag">
              Nog te weinig weken om een lijn te trekken. Zet elke zondag je ABN-afschrift in
              iCloud → Geld en er verschijnt vanzelf een verloop.
            </p>
          </Kaart>
        )}
        <Kaart className="flex items-baseline justify-between px-4 py-3.5">
          <span className="text-[15px] font-semibold">Gemiddeld per week eruit</span>
          <span className="text-[20px] font-bold tabular-nums">€ {euro(gemiddeldPerWeek)}</span>
        </Kaart>
      </div>

      {samenhang && (
        <>
          <Sectiekop className="mt-6">Samenhang</Sectiekop>
          <div className="mt-2.5">
            <AiKaart kop="Herstel en prestatie">
              {samenhang.betrouwbaar && samenhang.conclusie ? (
                samenhang.conclusie
              ) : (
                <>
                  Nog te weinig om iets te zeggen: {samenhang.n} dagen met zowel herstelcijfers
                  als een training. Vanaf {samenhang.min_nodig} volgt een eerste vergelijking.
                </>
              )}
            </AiKaart>
          </div>
        </>
      )}

      {weekoverzicht && (
        <>
          <Sectiekop className="mt-6">Week {weekoverzicht.week}</Sectiekop>
          <Kaart className="mt-2.5 px-4 py-[15px]">
            <p className="text-[14px] leading-[1.55] whitespace-pre-wrap text-body">
              {weekoverzicht.samenvatting}
            </p>
          </Kaart>
        </>
      )}

      <p className="mt-[18px] text-[12px] text-vaag">
        {dataset?.bijgewerkt
          ? `Bijgewerkt ${dataset.bijgewerkt.slice(0, 10)} · herstelcijfers handmatig ingevuld`
          : 'Nog niet bijgewerkt door de Mac'}
      </p>

      <TabBalk actief="tracking" onKies={(t) => t !== 'tracking' && onTab(t)} />
    </div>
  )
}
