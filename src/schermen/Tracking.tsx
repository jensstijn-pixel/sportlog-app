import { useMemo, useState } from 'react'
import type { Dataset, Post, Weekoverzicht } from '../types'
import Grafiek, { type Punt } from '../onderdelen/Grafiek'
import { AiKaart, Kaart, KeuzeChips, PaginaKop, Sectiekop, TabBalk } from '../onderdelen/ui'
import { euro } from '../lib/geld'

/** Wat er over tijd gebeurt: herstel, schermtijd en geld.
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
  posten,
  weekoverzicht,
  onTab,
}: {
  dataset: Dataset | null
  posten: Post[]
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

  const herstel = useMemo(
    () => (dataset?.herstel ?? []).filter((h) => h.datum >= grens),
    [dataset, grens],
  )

  const reeks = (sleutel: 'hrv' | 'slaap_min' | 'readiness' | 'rusthartslag'): Punt[] =>
    herstel.map((h) => ({ datum: h.datum, waarde: (h as unknown as Record<string, number | null>)[sleutel] ?? null }))

  /** Uitgaven per dag. Dagen zonder post tellen als nul: een dag waarop je
   *  niets uitgaf is een echte meting, geen gat. */
  const geldPunten = useMemo<Punt[]>(() => {
    const uit = posten.filter((p) => p.richting === 'af' && p.datum >= grens)
    if (!uit.length) return []
    const perDag = new Map<string, number>()
    for (const p of uit) perDag.set(p.datum, (perDag.get(p.datum) ?? 0) + p.bedragCent)
    const dagen = [...perDag.keys()].sort()
    const eerste = new Date(`${dagen[0]}T12:00:00`)
    const laatste = new Date(`${dagen[dagen.length - 1]}T12:00:00`)
    const punten: Punt[] = []
    for (let d = new Date(eerste); d <= laatste; d.setDate(d.getDate() + 1)) {
      const iso = d.toISOString().slice(0, 10)
      punten.push({ datum: iso, waarde: (perDag.get(iso) ?? 0) / 100 })
    }
    return punten
  }, [posten, grens])

  const maandUit = useMemo(() => {
    const maand = new Date().toISOString().slice(0, 7)
    return posten
      .filter((p) => p.richting === 'af' && p.datum.slice(0, 7) === maand)
      .reduce((s, p) => s + p.bedragCent, 0)
  }, [posten])

  const samenhang = dataset?.samenhang
  const dagenMetData = dataset?.herstel?.length ?? 0

  return (
    <div className="px-5 pt-[calc(env(safe-area-inset-top)+26px)] pb-28">
      <PaginaKop
        titel="Tracking"
        onder={
          dagenMetData
            ? `${dagenMetData} dagen · ${posten.length} geldposten`
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

      <Sectiekop className="mt-6">Herstel</Sectiekop>
      <div className="mt-2.5 grid grid-cols-1 gap-2.5">
        <Grafiek titel="HRV" punten={reeks('hrv')} eenheid="ms" trend />
        <Grafiek
          titel="Slaap"
          punten={reeks('slaap_min')}
          formatteer={(n) => `${Math.floor(n / 60)}u${String(Math.round(n % 60)).padStart(2, '0')}`}
          trend
        />
        <Grafiek titel="Readiness" punten={reeks('readiness')} trend />
        <Grafiek titel="Rusthartslag" punten={reeks('rusthartslag')} eenheid="bpm" hoogGoed={false} trend />
      </div>
      <p className="mt-2 text-[12px] text-vaag">dikke lijn = 7-daags gemiddelde</p>

      <Sectiekop className="mt-6">Geld</Sectiekop>
      <div className="mt-2.5 grid grid-cols-1 gap-2.5">
        {geldPunten.length >= 2 ? (
          <Grafiek
            titel="Uitgaven per dag"
            punten={geldPunten}
            eenheid="€"
            formatteer={(n) => euro(Math.round(n * 100))}
            hoogGoed={false}
            trend
          />
        ) : (
          <Kaart className="px-4 py-3.5">
            <p className="text-[14px] text-vaag">
              Nog te weinig posten om een lijn te trekken. Voer een paar dagen in en er
              verschijnt vanzelf een verloop.
            </p>
          </Kaart>
        )}
        <Kaart className="flex items-baseline justify-between px-4 py-3.5">
          <span className="text-[15px] font-semibold">Deze maand eruit</span>
          <span className="text-[20px] font-bold tabular-nums">€ {euro(maandUit)}</span>
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

      <p className="mt-[18px] text-[12px] text-[#5A5E5A]">
        {dataset?.bijgewerkt
          ? `Bijgewerkt ${dataset.bijgewerkt.slice(0, 10)} · herstelcijfers handmatig ingevuld`
          : 'Nog niet bijgewerkt door de Mac'}
      </p>

      <TabBalk actief="tracking" onKies={(t) => t !== 'tracking' && onTab(t)} />
    </div>
  )
}
