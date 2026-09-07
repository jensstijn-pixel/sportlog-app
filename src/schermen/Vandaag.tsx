import { useMemo } from 'react'
import type { Dagbrief, Herstel, Post, Schermtijd, Taak, Verrijking } from '../types'
import { nettoSchermtijd } from '../types'
import { vandaagISO } from '../lib/datum'
import { Kaart, PaginaKop, TabBalk, Vinkje, Vouw } from '../onderdelen/ui'
import { euro } from '../lib/geld'

/** Het ochtendscherm: alles wat je wilt weten voordat de dag begint.
 *
 *  Twee bronnen, bewust gescheiden. De **brief** komt van de Mac (07:50) en
 *  levert training, agenda en de duiding bij je slaap — dat is denkwerk dat
 *  daar gebeurt. De **app zelf** levert taken, geld en of je cijfers al
 *  ingevuld zijn, want dat verandert door de dag heen: een taak die je om tien
 *  uur afvinkt moet meteen weg zijn, en een brief van vanochtend weet dat niet.
 *
 *  Gevolg van die splitsing: dit scherm is nooit leeg. Geen netwerk, geen Mac
 *  aan, brief van gisteren — je ziet altijd nog je taken, je geldstand en de
 *  kaartjes om je cijfers in te vullen. */

const MAANDEN = [
  'januari', 'februari', 'maart', 'april', 'mei', 'juni',
  'juli', 'augustus', 'september', 'oktober', 'november', 'december',
]
const DAGEN = ['zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag']

function langeDatum(iso: string): string {
  const d = new Date(`${iso}T12:00:00`)
  return `${DAGEN[d.getDay()]} ${d.getDate()} ${MAANDEN[d.getMonth()]}`
}

function urenTekst(minuten: number | null | undefined): string | null {
  if (minuten == null) return null
  return `${Math.floor(minuten / 60)}u${String(minuten % 60).padStart(2, '0')}`
}

/** De kaartjes bovenaan heten al "Vannacht" en "Schermtijd gisteren". De brief
 *  gebruikt dezelfde koppen, en twee keer dezelfde kop onder elkaar leest als
 *  een fout. Hier krijgen die twee secties daarom een kop die zegt wat ze
 *  toevoegen: de duiding, niet het cijfer. */
const KOP_IN_APP: Record<string, string> = {
  oura: 'Over je nacht',
  schermtijd: 'Over je schermtijd',
}

/** Eén blok uit de brief. De tekst is platte tekst met regeleinden, dus die
 *  laten we staan zoals hij is; alleen de kop krijgt eigen opmaak. */
function BriefBlok({ id, titel, tekst }: { id: string; titel: string; tekst: string }) {
  return (
    <Vouw
      titel={titel}
      sleutel={id}
      // De training wil je 's ochtends meteen zien; de rest is naslag.
      standaardOpen={id === 'training'}
      rechts={eersteRegel(tekst)}
    >
      <Kaart className="px-4 py-[15px]">
        <p className="text-[14px] leading-[1.55] whitespace-pre-wrap text-body">{tekst}</p>
      </Kaart>
    </Vouw>
  )
}

/** Korte samenvatting voor naast een dichte sectiekop: de eerste regel,
 *  afgekapt. Zo zie je dicht al waar het over gaat. */
function eersteRegel(tekst: string, max = 26): string {
  const regel = tekst.split('\n').find((r) => r.trim()) ?? ''
  return regel.length > max ? regel.slice(0, max - 1).trimEnd() + '…' : regel
}

export default function Vandaag({
  brief,
  taken,
  verrijking,
  posten,
  herstel,
  schermtijd,
  onAfvinken,
  onHerstel,
  onSchermtijd,
  onInstellingen,
  onTab,
}: {
  brief: Dagbrief | null
  taken: Taak[]
  verrijking: Record<string, Verrijking>
  posten: Post[]
  herstel?: Herstel
  schermtijd?: Schermtijd
  onAfvinken: (taak: Taak, klaar: boolean) => void
  onHerstel: () => void
  onSchermtijd: () => void
  onInstellingen: () => void
  onTab: (tab: 'logboek' | 'tracking') => void
}) {
  const vandaag = vandaagISO()

  const vanVandaag = useMemo(
    () => taken.filter((t) => !t.klaar && verrijking[t.id]?.gepland === vandaag),
    [taken, verrijking, vandaag],
  )
  const openTotaal = useMemo(() => taken.filter((t) => !t.klaar).length, [taken])

  const geld = useMemo(() => {
    const maand = vandaag.slice(0, 7)
    const rij = posten.filter((p) => p.datum.slice(0, 7) === maand)
    const uit = rij.filter((p) => p.richting === 'af').reduce((s, p) => s + p.bedragCent, 0)
    const inn = rij.filter((p) => p.richting === 'bij').reduce((s, p) => s + p.bedragCent, 0)
    return { uit, inn, saldo: inn - uit }
  }, [posten, vandaag])

  // De brief is van vandaag, of hij is het niet. In dat tweede geval tonen we
  // hem niet: liever een eerlijke lege plek dan de training van gisteren.
  const briefVanVandaag = brief && brief.datum === vandaag ? brief : null
  const secties = (briefVanVandaag?.secties ?? []).filter((s) => s.id !== 'datum')
  const dagregel = briefVanVandaag?.secties.find((s) => s.id === 'datum')?.tekst

  const slaap = urenTekst(herstel?.slaapMinuten)
  const netto = urenTekst(nettoSchermtijd(schermtijd))

  return (
    <div className="px-5 pt-[calc(env(safe-area-inset-top)+26px)] pb-28">
      <PaginaKop
        titel="Vandaag"
        onder={langeDatum(vandaag)}
        rechts={
          <button
            type="button"
            onClick={onInstellingen}
            aria-label="Instellingen"
            className="grid h-9 w-9 place-items-center rounded-full bg-kaart text-[15px] text-mut"
          >
            ⚙
          </button>
        }
      />

      {dagregel && (
        <p className="mt-3 text-[15px] leading-[1.5] text-body">{dagregel.split('\n').pop()}</p>
      )}

      {/* Invullen wat de Mac niet kan weten. Staat bovenaan omdat dit het
          eerste is wat je 's ochtends doet. */}
      <Kaart className="mt-5">
        <button
          type="button"
          onClick={onHerstel}
          className="flex w-full items-center justify-between px-4 py-3.5 text-left"
        >
          <span>
            <span className="block text-[12px] text-mut">Vannacht</span>
            <span className="mt-[3px] block text-[16px] font-semibold">
              {slaap
                ? `${slaap}${herstel?.hrv ? ` · HRV ${herstel.hrv}` : ''}${
                    herstel?.readiness ? ` · Readiness ${herstel.readiness}` : ''
                  }`
                : 'Nog niet ingevuld'}
            </span>
          </span>
          <span className="text-vaag">›</span>
        </button>
        <div className="kaartlijn" />
        <button
          type="button"
          onClick={onSchermtijd}
          className="flex w-full items-center justify-between px-4 py-3.5 text-left"
        >
          <span>
            <span className="block text-[12px] text-mut">Schermtijd gisteren</span>
            <span className="mt-[3px] block text-[16px] font-semibold">
              {netto ? `${netto} netto` : 'Nog niet ingevuld'}
            </span>
          </span>
          <span className="text-vaag">›</span>
        </button>
      </Kaart>

      {/* Te doen komt uit de app, niet uit de brief: afvinken moet meteen
          werken. */}
      <Vouw
        titel="Te doen"
        sleutel="taken"
        standaardOpen
        rechts={vanVandaag.length ? `${vanVandaag.length} vandaag` : 'niets gepland'}
      >
      {vanVandaag.length ? (
        <div className="grid grid-cols-1 gap-2.5">
          {vanVandaag.map((t) => (
            <Kaart key={t.id} className="flex items-start gap-3 px-4 py-3.5">
              <Vinkje aan={false} onClick={() => onAfvinken(t, true)} label={`Vink af: ${t.tekst}`} />
              <div className="min-w-0 flex-1">
                <p className="text-[16px] font-semibold leading-[1.3]">{t.tekst}</p>
                {verrijking[t.id]?.toelichting && (
                  <p className="mt-[7px] truncate text-[13px] text-notitie">
                    ✦ {verrijking[t.id].toelichting}
                  </p>
                )}
              </div>
            </Kaart>
          ))}
        </div>
      ) : (
        <Kaart className="px-4 py-3.5">
          <p className="text-[14px] text-vaag">
            {openTotaal
              ? `Niets voor vandaag gepland. ${openTotaal} open ${
                  openTotaal === 1 ? 'taak' : 'taken'
                } in het logboek.`
              : 'Geen open taken.'}
          </p>
        </Kaart>
      )}
      </Vouw>

      {/* Geld: alleen de stand, invoeren gebeurt in het logboek. */}
      <Vouw
        titel="Geld deze maand"
        sleutel="geld"
        rechts={`${geld.saldo < 0 ? '−' : '+'} € ${euro(Math.abs(geld.saldo))}`}
      >
      <button type="button" onClick={() => onTab('logboek')} className="block w-full text-left">
        <Kaart className="grid grid-cols-3 px-4 py-[15px] text-center">
          <div>
            <div className="text-[12px] text-mut">Eruit</div>
            <div className="mt-[3px] text-[16px] font-bold tabular-nums">€ {euro(geld.uit)}</div>
          </div>
          <div>
            <div className="text-[12px] text-mut">Erin</div>
            <div className="mt-[3px] text-[16px] font-bold tabular-nums text-accent">
              € {euro(geld.inn)}
            </div>
          </div>
          <div>
            <div className="text-[12px] text-mut">Verschil</div>
            <div
              className={`mt-[3px] text-[16px] font-bold tabular-nums ${
                geld.saldo < 0 ? 'text-tekst' : 'text-accent'
              }`}
            >
              {geld.saldo < 0 ? '−' : '+'} € {euro(Math.abs(geld.saldo))}
            </div>
          </div>
        </Kaart>
      </button>
      </Vouw>

      {/* De rest van de brief: training, agenda, duiding. */}
      {secties.map((s) => (
        <BriefBlok key={s.id} id={s.id} titel={KOP_IN_APP[s.id] ?? s.titel} tekst={s.tekst} />
      ))}

      {!briefVanVandaag && (
        <Kaart className="mt-6 px-4 py-[15px]">
          <p className="text-[14px] leading-[1.55] text-vaag">
            {brief
              ? `De brief van vandaag staat er nog niet — deze is van ${brief.datum}. `
              : 'Er staat nog geen ochtendbrief in de app. '}
            Training en agenda verschijnen zodra de Mac hem 's ochtends heeft gemaakt.
          </p>
        </Kaart>
      )}

      <p className="mt-6 text-[12px] text-[#5A5E5A]">
        {briefVanVandaag
          ? `Brief van ${briefVanVandaag.gegenereerd_op.slice(11, 16)} · taken en geld live uit de app`
          : 'Taken en geld komen live uit de app'}
      </p>

      <TabBalk actief="vandaag" aantalTaken={vanVandaag.length} onKies={(t) => t !== 'vandaag' && onTab(t)} />
    </div>
  )
}
