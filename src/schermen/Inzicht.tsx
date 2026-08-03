import { useMemo, useState } from 'react'
import type { Notitie, Weekoverzicht } from '../types'
import {
  WEEKDAGEN,
  duurTekst,
  weekBereikTekst,
  weekDagen,
  weekJaar,
  weeknummer,
} from '../lib/datum'
import { AiKaart, Eyebrow, RondeKnop } from '../onderdelen/ui'

export default function Inzicht({
  notities,
  overzichten,
  gesteldeVragen,
  onTerug,
  onVraag,
}: {
  notities: Notitie[]
  overzichten: Record<string, Weekoverzicht>
  gesteldeVragen: { vraag: string; op: string }[]
  onTerug: () => void
  onVraag: (vraag: string) => Promise<void>
}) {
  const [verschuiving, setVerschuiving] = useState(0)
  const [vraag, setVraag] = useState('')
  const [bezig, setBezig] = useState(false)
  const [melding, setMelding] = useState<string | null>(null)

  const week = useMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() + verschuiving * 7)
    const dagen = weekDagen(d)
    return {
      dagen,
      nummer: weeknummer(d),
      jaar: weekJaar(d),
      sleutel: `${weekJaar(d)}-${String(weeknummer(d)).padStart(2, '0')}`,
    }
  }, [verschuiving])

  const vanDeWeek = useMemo(
    () => notities.filter((n) => week.dagen.includes(n.datum)),
    [notities, week],
  )

  const totaal = vanDeWeek.reduce((som, n) => som + (n.duurMinuten ?? 0), 0)
  const energieGem = vanDeWeek.length
    ? (vanDeWeek.reduce((som, n) => som + n.energie, 0) / vanDeWeek.length).toFixed(1).replace('.', ',')
    : '—'

  // Een dag mét notitie krijgt altijd een zichtbare balk, ook als de duur nog
  // niet ingevuld is (die vult de Mac later aan uit Hevy).
  const perDag = week.dagen.map((iso) => {
    const dag = vanDeWeek.filter((n) => n.datum === iso)
    return {
      minuten: dag.reduce((som, n) => som + (n.duurMinuten ?? 0), 0),
      getraind: dag.length > 0,
    }
  })
  const langste = Math.max(...perDag.map((d) => d.minuten), 1)

  const overzicht = overzichten[week.sleutel]
  const laatsteAntwoord = overzicht?.antwoorden?.[0]

  async function verstuur() {
    const tekst = vraag.trim()
    if (!tekst || bezig) return
    setBezig(true)
    setMelding(null)
    try {
      await onVraag(tekst)
      setVraag('')
      setMelding('Staat klaar — antwoord komt in je ochtendbrief.')
    } catch (e) {
      setMelding(e instanceof Error ? e.message : 'Versturen mislukt.')
    } finally {
      setBezig(false)
    }
  }

  return (
    <div className="flex min-h-dvh flex-col px-5 pt-[calc(env(safe-area-inset-top)+18px)] pb-[calc(env(safe-area-inset-bottom)+16px)]">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="flex items-center gap-2.5 text-[32px] font-extrabold tracking-[-0.02em]">
            Inzicht <span className="text-[22px] text-accent">✦</span>
          </h1>
          <div className="mt-1">
            <Eyebrow>
              Week {week.nummer} · {weekBereikTekst(week.dagen)}
            </Eyebrow>
          </div>
        </div>
        <div className="flex gap-2 pb-1">
          <RondeKnop label="Vorige week" onClick={() => setVerschuiving((v) => v - 1)}>
            ‹
          </RondeKnop>
          <RondeKnop label="Volgende week" onClick={() => setVerschuiving((v) => Math.min(0, v + 1))}>
            ›
          </RondeKnop>
        </div>
      </div>

      <div className="mt-4 flex gap-2.5">
        <Stat waarde={String(vanDeWeek.length)} label="Workouts" accent />
        <Stat waarde={totaal ? duurTekst(totaal) : '—'} label="Totaal" />
        <Stat waarde={energieGem} label="Energie ø" />
      </div>

      <div className="kaart mt-3 rounded-[16px] p-4">
        <div className="flex h-[90px] items-end gap-3">
          {perDag.map((dag, i) => (
            <div key={i} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
              <div
                className={`w-full rounded-[6px] ${dag.getraind ? 'bg-accent' : 'bg-white/8'}`}
                style={{
                  height: dag.getraind
                    ? `${Math.max(18, (dag.minuten / langste) * 100)}%`
                    : '6px',
                }}
              />
              <span className="font-mono text-[10px] text-tekst/40">{WEEKDAGEN[i]}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-3">
        {overzicht ? (
          <div className="ai-kaart rounded-[16px] p-4">
            <div className="flex items-center gap-[7px] text-[12px] font-bold uppercase tracking-[0.08em] text-accent">
              <span className="text-[13px]">✦</span> Samenvatting
            </div>
            <p className="mt-2 whitespace-pre-wrap text-[14.5px] leading-[1.6] text-tekst/80">
              {overzicht.samenvatting}
            </p>
          </div>
        ) : (
          <AiKaart kop="Samenvatting">
            {vanDeWeek.length
              ? 'Je samenvatting van deze week wordt op de Mac gemaakt en verschijnt hier zodra je ochtendbrief gedraaid heeft.'
              : 'Nog geen notities deze week.'}
          </AiKaart>
        )}
      </div>

      {laatsteAntwoord && (
        <div className="kaart mt-3 rounded-[16px] p-4">
          <div className="text-[11px] uppercase tracking-[0.08em] text-tekst/45">Je vroeg</div>
          <div className="mt-1 text-[13px] leading-[1.45] text-tekst/60">
            {laatsteAntwoord.vraag}
          </div>
          <p className="mt-2 whitespace-pre-wrap text-[14px] leading-[1.55] text-tekst/80">
            {laatsteAntwoord.antwoord}
          </p>
        </div>
      )}

      {gesteldeVragen.length > 0 && !laatsteAntwoord && (
        <p className="mt-3 text-[12px] leading-[1.5] text-tekst/40">
          Je laatste vraag staat klaar: “{gesteldeVragen[0].vraag}”. Het antwoord komt in je
          eerstvolgende ochtendbrief.
        </p>
      )}

      <div className="mt-auto pt-6">
        {melding && <p className="mb-2 text-center text-[12px] text-tekst/50">{melding}</p>}
        <div className="kaart flex items-center gap-3 rounded-full px-[18px] py-3">
          <input
            value={vraag}
            onChange={(e) => setVraag(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && verstuur()}
            placeholder="Vraag iets over je training…"
            enterKeyHint="send"
            className="min-w-0 flex-1 text-[14px]"
          />
          <button
            type="button"
            onClick={verstuur}
            disabled={!vraag.trim() || bezig}
            aria-label="Vraag versturen"
            className={`flex size-[30px] shrink-0 items-center justify-center rounded-full font-extrabold ${
              vraag.trim() && !bezig ? 'bg-accent text-bg' : 'bg-white/10 text-tekst/30'
            }`}
          >
            ↑
          </button>
        </div>
        <button type="button" onClick={onTerug} className="mt-4 w-full text-center text-[13px] text-tekst/40">
          ‹ Terug naar logboek
        </button>
      </div>
    </div>
  )
}

function Stat({ waarde, label, accent = false }: { waarde: string; label: string; accent?: boolean }) {
  return (
    <div className="kaart flex-1 rounded-[14px] px-3.5 py-3">
      <div className={`text-[24px] font-extrabold ${accent ? 'text-accent' : ''}`}>{waarde}</div>
      <div className="mt-0.5 text-[11px] uppercase tracking-[0.06em] text-tekst/45">{label}</div>
    </div>
  )
}
