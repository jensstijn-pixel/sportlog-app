import { useEffect, useMemo, useRef, useState } from 'react'
import type { Notitie, Post, Richting, Schermtijd, Herstel, Taak, Verrijking } from '../types'
import { TYPE_LABELS } from '../types'
import { korteDatum, parseISO, vandaagISO, weekDagen } from '../lib/datum'
import {
  AccentKnop,
  Chip,
  Kaart,
  KaartKnop,
  Leeg,
  PaginaKop,
  Schakelaar,
  Sectiekop,
  TabBalk,
  Vinkje,
} from '../onderdelen/ui'
import { euro, naarCent } from '../lib/geld'

/** Alles vastleggen, met de dag als kapstok.
 *
 *  De weekstrip bovenaan werkt als in Apple Agenda: horizontaal swipen per
 *  week, een dag aantikken selecteert hem. Daaronder staat wat er die dag
 *  gebeurde: je workout-notitie en je geldposten.
 *
 *  **Taken hangen bewust níét aan de geselecteerde dag.** Een taak die je op
 *  maandag opschrijft doe je woensdag; hem alleen op maandag tonen zou hem
 *  laten verdwijnen. Ze staan dus onderaan als één lijst, los van de kalender.
 *  Welke taak vandaag aan de beurt is bepaalt de Mac, en dat zie je op Vandaag. */

const WEKEN_TERUG = 5
const WEEKDAGLETTERS = ['MA', 'DI', 'WO', 'DO', 'VR', 'ZA', 'ZO']

const MAANDEN = [
  'januari', 'februari', 'maart', 'april', 'mei', 'juni',
  'juli', 'augustus', 'september', 'oktober', 'november', 'december',
]

function maandLabel(iso: string): string {
  const d = parseISO(iso)
  return `${MAANDEN[d.getMonth()]} ${d.getFullYear()}`
}

/** De weken die in de strip passen: een aantal terug tot en met deze week. */
function bouwWeken(vandaag: string): string[][] {
  const nu = parseISO(vandaag)
  const weken: string[][] = []
  for (let i = WEKEN_TERUG; i >= 0; i--) {
    const d = new Date(nu.getFullYear(), nu.getMonth(), nu.getDate() - i * 7)
    weken.push(weekDagen(d))
  }
  return weken
}

export default function Logboek({
  notities,
  status,
  posten,
  taken,
  verrijking,
  herstel,
  schermtijd,
  onNieuweNotitie,
  onOpenNotitie,
  onPostToevoegen,
  onPostVerwijder,
  onTaakToevoegen,
  onTaakAfvinken,
  onInzicht,
  onTab,
}: {
  notities: Notitie[]
  /** Kort woord over de koppeling; komt in de subtitel te staan. */
  status: string
  posten: Post[]
  taken: Taak[]
  verrijking: Record<string, Verrijking>
  herstel: Record<string, Herstel>
  schermtijd: Record<string, Schermtijd>
  onNieuweNotitie: (datum: string) => void
  onOpenNotitie: (n: Notitie) => void
  onPostToevoegen: (p: { datum: string; bedragCent: number; richting: Richting; tekst: string }) => void
  onPostVerwijder: (id: string) => void
  onTaakToevoegen: (tekst: string) => void
  onTaakAfvinken: (taak: Taak, klaar: boolean) => void
  onInzicht: () => void
  onTab: (tab: 'vandaag' | 'tracking') => void
}) {
  const vandaag = vandaagISO()
  const [gekozen, setGekozen] = useState(vandaag)
  const weken = useMemo(() => bouwWeken(vandaag), [vandaag])
  const strip = useRef<HTMLDivElement>(null)

  // Bij openen meteen op de huidige week staan; die is de laatste in de rij.
  useEffect(() => {
    const el = strip.current
    if (el) el.scrollLeft = el.scrollWidth
  }, [])

  function naarVandaag() {
    setGekozen(vandaag)
    strip.current?.scrollTo({ left: strip.current.scrollWidth, behavior: 'smooth' })
  }

  const notitie = notities.find((n) => n.datum === gekozen)
  const dagPosten = useMemo(
    () => posten.filter((p) => p.datum === gekozen),
    [posten, gekozen],
  )
  const openTaken = useMemo(
    () =>
      taken
        .filter((t) => !t.klaar)
        .sort((a, b) => {
          const va = verrijking[a.id]
          const vb = verrijking[b.id]
          if (!va && vb) return -1
          if (va && !vb) return 1
          if (va && vb && va.prioriteit !== vb.prioriteit) return va.prioriteit - vb.prioriteit
          return a.gemaakt < b.gemaakt ? 1 : -1
        }),
    [taken, verrijking],
  )

  // Geld invoeren
  const [richting, setRichting] = useState<Richting>('af')
  const [bedrag, setBedrag] = useState('')
  const [omschrijving, setOmschrijving] = useState('')
  const cent = naarCent(bedrag)
  const kanBewaren = cent !== null && omschrijving.trim().length > 0

  function bewaarPost() {
    if (cent === null || !omschrijving.trim()) return
    onPostToevoegen({ datum: gekozen, bedragCent: cent, richting, tekst: omschrijving.trim() })
    setBedrag('')
    setOmschrijving('')
  }

  // Taak invoeren
  const [taakTekst, setTaakTekst] = useState('')
  function bewaarTaak() {
    const schoon = taakTekst.trim()
    if (!schoon) return
    onTaakToevoegen(schoon)
    setTaakTekst('')
  }

  const gekozenLabel = gekozen === vandaag ? `Vandaag · ${korteDatum(gekozen)}` : korteDatum(gekozen)

  return (
    <div className="pt-[26px] pb-28">
      <div className="px-5">
        <PaginaKop
          titel="Logboek"
          onder={`${maandLabel(gekozen)} · ${status}`}
          rechts={
            <div className="flex items-center gap-2">
              {gekozen !== vandaag && (
                <button
                  type="button"
                  onClick={naarVandaag}
                  className="pil bg-kaart px-4 py-[9px] text-[13px] text-accent"
                >
                  Vandaag
                </button>
              )}
              <button
                type="button"
                onClick={onInzicht}
                aria-label="Weekoverzicht"
                className="grid h-9 w-9 place-items-center rounded-full bg-kaart text-[15px] text-accent"
              >
                ✦
              </button>
            </div>
          }
        />
      </div>

      {/* Weekstrip: één week per schermbreedte, snappend per week. */}
      <div
        ref={strip}
        className="geen-balk mt-5 flex snap-x snap-mandatory overflow-x-auto px-2"
        role="group"
        aria-label="Kies een dag"
      >
        {weken.map((week) => (
          <div key={week[0]} className="grid w-full flex-none snap-start grid-cols-7">
            {week.map((dag, i) => {
              const isVandaag = dag === vandaag
              const aan = dag === gekozen
              const buitenMaand = parseISO(dag).getMonth() !== parseISO(gekozen).getMonth()
              return (
                <button
                  key={dag}
                  type="button"
                  onClick={() => setGekozen(dag)}
                  aria-pressed={aan}
                  aria-label={korteDatum(dag)}
                  className="flex flex-col items-center gap-1.5 py-1"
                >
                  <span
                    className="text-[10px] font-semibold"
                    style={{ color: aan ? '#C3E0FF' : '#6C706A' }}
                  >
                    {WEEKDAGLETTERS[i]}
                  </span>
                  <span
                    className={`grid h-9 w-9 place-items-center rounded-full text-[15px] ${
                      aan ? 'bg-accent font-bold text-inkt' : ''
                    }`}
                    style={
                      aan
                        ? undefined
                        : { color: isVandaag ? '#9CCBFF' : buitenMaand ? '#54584C' : '#EDEFEA' }
                    }
                  >
                    {parseISO(dag).getDate()}
                  </span>
                  <span
                    className="h-1 w-1 rounded-full"
                    style={{ background: isVandaag && !aan ? '#9CCBFF' : 'transparent' }}
                  />
                </button>
              )
            })}
          </div>
        ))}
      </div>

      <div className="mx-5 mt-3.5 mb-5 h-px bg-rand" />

      <div className="px-5">
        <div className="sectiekop">{gekozenLabel}</div>

        {/* Notitie van die dag */}
        {notitie ? (
          <button
            type="button"
            onClick={() => onOpenNotitie(notitie)}
            className="mt-2.5 block w-full text-left"
          >
            <Kaart className="px-4 py-[15px]">
              <div className="flex items-center gap-2.5">
                <Chip>{TYPE_LABELS[notitie.type]}</Chip>
                <span className="text-[13px] text-mut">energie {notitie.energie}/5</span>
              </div>
              <p className="mt-[9px] line-clamp-3 text-[14px] leading-[1.5] text-body">
                {notitie.tekst}
              </p>
            </Kaart>
          </button>
        ) : (
          <div className="mt-2.5">
            <Leeg>Nog geen notitie voor deze dag.</Leeg>
          </div>
        )}

        <div className="mt-4 flex justify-center">
          <AccentKnop onClick={() => onNieuweNotitie(gekozen)}>+ Nieuwe notitie</AccentKnop>
        </div>

        {/* Geld van die dag */}
        <Sectiekop className="mt-8">Geld</Sectiekop>
        <div className="kaart mt-2.5 rounded-[20px] p-3.5">
          <Schakelaar
            waarde={richting}
            opties={[
              { waarde: 'af' as Richting, label: '− eraf' },
              { waarde: 'bij' as Richting, label: '+ erbij' },
            ]}
            onKies={setRichting}
          />
          <div className="mt-4 flex items-baseline gap-2 px-1">
            <span className="text-[28px] font-semibold text-vaag" aria-hidden="true">
              €
            </span>
            <input
              type="text"
              inputMode="decimal"
              autoComplete="off"
              aria-label="Bedrag in euro"
              placeholder="0,00"
              value={bedrag}
              onChange={(e) => setBedrag(e.target.value)}
              className="min-w-0 flex-1 text-[32px] font-bold tabular-nums"
            />
          </div>
          <input
            type="text"
            aria-label="Wat was het, en waarvoor"
            placeholder="Wat was het? Bijv. boodschappen Jumbo"
            value={omschrijving}
            onChange={(e) => setOmschrijving(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && kanBewaren && bewaarPost()}
            className="mt-3.5 w-full rounded-[14px] bg-bg px-3.5 py-3 text-[15px]"
          />
          <div className="mt-3.5 flex items-center justify-between px-0.5">
            <span className="text-[13px] text-mut">
              {gekozen === vandaag ? 'Vandaag' : korteDatum(gekozen)}
            </span>
            <KaartKnop onClick={bewaarPost} uit={!kanBewaren}>
              Bewaren
            </KaartKnop>
          </div>
        </div>

        {dagPosten.length > 0 && (
          <div className="mt-2.5 grid gap-1.5">
            {dagPosten.map((p) => (
              <div key={p.id} className="flex items-center gap-2.5 rounded-[14px] bg-kaart px-3.5 py-3">
                <span className="min-w-0 flex-1 truncate text-[14px] text-body">{p.tekst}</span>
                <span
                  className={`shrink-0 text-[14px] font-bold tabular-nums ${
                    p.richting === 'bij' ? 'text-accent' : 'text-tekst'
                  }`}
                >
                  {p.richting === 'af' ? '−' : '+'} € {euro(p.bedragCent)}
                </span>
                <button
                  type="button"
                  onClick={() => onPostVerwijder(p.id)}
                  aria-label={`Verwijder ${p.tekst}`}
                  className="shrink-0 px-1 text-[15px] text-vaag"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Cijfers van die dag, alleen als ze er zijn */}
        {(herstel[gekozen] || schermtijd[gekozen]) && (
          <>
            <Sectiekop className="mt-8">Cijfers</Sectiekop>
            <Kaart className="mt-2.5 px-4 py-3.5">
              {herstel[gekozen] && (
                <p className="text-[14px] text-body">
                  Slaap {Math.floor((herstel[gekozen].slaapMinuten ?? 0) / 60)}u
                  {String((herstel[gekozen].slaapMinuten ?? 0) % 60).padStart(2, '0')}
                  {herstel[gekozen].hrv ? ` · HRV ${herstel[gekozen].hrv}` : ''}
                  {herstel[gekozen].readiness ? ` · Readiness ${herstel[gekozen].readiness}` : ''}
                </p>
              )}
              {schermtijd[gekozen] && (
                <p className="mt-1.5 text-[14px] text-body">
                  Schermtijd {schermtijd[gekozen].totaalMinuten} min bruto
                </p>
              )}
            </Kaart>
          </>
        )}

        {/* To-do staat los van de kalender: zie de toelichting bovenaan. */}
        <Sectiekop className="mt-8">
          To-do{openTaken.length ? ` · ${openTaken.length} open` : ''}
        </Sectiekop>
        <Kaart className="mt-2.5 p-4">
          <textarea
            rows={2}
            placeholder="Wat schiet je te binnen?"
            value={taakTekst}
            onChange={(e) => setTaakTekst(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                bewaarTaak()
              }
            }}
            className="w-full resize-none text-[16px] leading-[1.4]"
          />
          <div className="mt-2 flex items-center justify-between gap-3">
            <span className="text-[12px] text-vaag">
              Onbewerkt is prima — ik sorteer het 's ochtends.
            </span>
            <KaartKnop onClick={bewaarTaak} uit={!taakTekst.trim()}>
              Zet erbij
            </KaartKnop>
          </div>
        </Kaart>

        {openTaken.length > 0 && (
          <div className="mt-2.5 grid gap-2.5">
            {openTaken.map((t) => {
              const v = verrijking[t.id]
              return (
                <Kaart key={t.id} className="flex items-start gap-3 px-4 py-3.5">
                  <Vinkje
                    aan={false}
                    onClick={() => onTaakAfvinken(t, true)}
                    label={`Vink af: ${t.tekst}`}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-[16px] font-semibold leading-[1.3]">{t.tekst}</p>
                    <div className="mt-[7px] flex flex-wrap items-center gap-2">
                      <Chip klein>{v ? v.categorie : 'Inbox'}</Chip>
                      <span className="text-[12px] text-mut">
                        {v?.gepland ? korteDatum(v.gepland) : 'Sorteren'}
                      </span>
                    </div>
                    {v?.toelichting && (
                      <p className="mt-[7px] truncate text-[13px] text-notitie">✦ {v.toelichting}</p>
                    )}
                  </div>
                </Kaart>
              )
            })}
          </div>
        )}
      </div>

      <TabBalk actief="logboek" onKies={(t) => t !== 'logboek' && onTab(t)} />
    </div>
  )
}
