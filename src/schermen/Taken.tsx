import { useMemo, useRef, useState } from 'react'
import { CATEGORIE_LABELS, type Taak, type Verrijking } from '../types'
import { korteDatum, vandaagISO } from '../lib/datum'
import { Eyebrow, TabBalk, Titel } from '../onderdelen/ui'

/** Hoe lang een afgevinkte taak nog zichtbaar blijft onder "Afgerond".
 *  Daarna is hij uit beeld; de Mac ruimt het bestand later op. */
const KLAAR_ZICHTBAAR_DAGEN = 3

const PRIO_LABEL: Record<number, string> = { 1: 'Eerst', 2: 'Daarna', 3: 'Ooit' }

function dagenGeleden(iso: string): number {
  const toen = new Date(iso).getTime()
  if (Number.isNaN(toen)) return 0
  return Math.floor((Date.now() - toen) / 86_400_000)
}

export default function Taken({
  taken,
  verrijking,
  onToevoegen,
  onAfvinken,
  onVerwijder,
  onTerug,
  onInzicht,
  onTracking,
  onFinancien,
}: {
  taken: Taak[]
  verrijking: Record<string, Verrijking>
  onToevoegen: (tekst: string) => void
  onAfvinken: (taak: Taak, klaar: boolean) => void
  onVerwijder: (id: string) => void
  onTerug: () => void
  onInzicht: () => void
  onTracking: () => void
  onFinancien: () => void
}) {
  const [tekst, setTekst] = useState('')
  const invoer = useRef<HTMLTextAreaElement>(null)
  const vandaag = vandaagISO()

  const { open, klaar } = useMemo(() => {
    const open = taken.filter((t) => !t.klaar)
    // Sorteren op wat de Mac ervan vond; taken die hij nog niet zag komen
    // bovenaan als "nieuw", want die wil je zelf even zien.
    open.sort((a, b) => {
      const va = verrijking[a.id]
      const vb = verrijking[b.id]
      if (!va && vb) return -1
      if (va && !vb) return 1
      if (va && vb && va.prioriteit !== vb.prioriteit) return va.prioriteit - vb.prioriteit
      return a.gemaakt < b.gemaakt ? 1 : -1
    })
    const klaar = taken
      .filter((t) => t.klaar && dagenGeleden(t.klaarOp ?? t.bijgewerkt) < KLAAR_ZICHTBAAR_DAGEN)
      .sort((a, b) => ((a.klaarOp ?? '') < (b.klaarOp ?? '') ? 1 : -1))
    return { open, klaar }
  }, [taken, verrijking])

  function voegToe() {
    const schoon = tekst.trim()
    if (!schoon) return
    onToevoegen(schoon)
    setTekst('')
    invoer.current?.focus()
  }

  const vandaagLijst = open.filter((t) => verrijking[t.id]?.gepland === vandaag)

  return (
    <div className="min-h-dvh px-5 pt-[calc(env(safe-area-inset-top)+18px)] pb-32">
      <div className="flex items-end justify-between">
        <div>
          <Titel>To-do</Titel>
          <div className="mt-1">
            <Eyebrow>
              {open.length === 0
                ? 'niets open'
                : `${open.length} open${vandaagLijst.length ? ` · ${vandaagLijst.length} vandaag` : ''}`}
            </Eyebrow>
          </div>
        </div>
        <button
          type="button"
          onClick={onTerug}
          className="pb-1 text-[13px] font-semibold text-tekst/50"
        >
          Sluiten
        </button>
      </div>

      <div className="kaart mt-4 rounded-[16px] p-3">
        <textarea
          ref={invoer}
          value={tekst}
          onChange={(e) => setTekst(e.target.value)}
          onKeyDown={(e) => {
            // Enter verstuurt; shift+enter maakt een nieuwe regel.
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              voegToe()
            }
          }}
          rows={2}
          placeholder="Wat schiet je te binnen?"
          className="w-full resize-none bg-transparent text-[15px] leading-[1.5] outline-none placeholder:text-tekst/30"
        />
        <div className="mt-1 flex items-center justify-between">
          <span className="text-[11px] text-tekst/35">
            Onbewerkt is prima — ik sorteer het 's ochtends.
          </span>
          <button
            type="button"
            onClick={voegToe}
            disabled={!tekst.trim()}
            className="rounded-full bg-accent px-4 py-2 text-[13px] font-extrabold text-bg disabled:opacity-25"
          >
            Zet erbij
          </button>
        </div>
      </div>

      {open.length === 0 && klaar.length === 0 && (
        <div className="kaart mt-3 rounded-[16px] px-4 py-8 text-center text-[13px] text-tekst/40">
          Nog niets. Gooi hierboven maar neer wat je te binnen schiet.
        </div>
      )}

      {open.length > 0 && (
        <div className="mt-5 flex flex-col gap-2">
          {open.map((t) => {
            const v = verrijking[t.id]
            const vandaagGepland = v?.gepland === vandaag
            return (
              <div
                key={t.id}
                className={`kaart rounded-[16px] px-4 py-3.5 ${
                  vandaagGepland ? 'border border-accent/35' : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    aria-label="Afvinken"
                    onClick={() => onAfvinken(t, true)}
                    className="mt-0.5 flex size-[22px] shrink-0 items-center justify-center rounded-full border border-white/25 text-transparent active:border-accent active:text-accent"
                  >
                    ✓
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] leading-[1.45]">{t.tekst}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px]">
                      {vandaagGepland && (
                        <span className="rounded-full bg-accent px-2 py-0.5 font-bold text-bg">
                          Vandaag
                        </span>
                      )}
                      {v ? (
                        <>
                          <span className="rounded-full bg-accent/14 px-2 py-0.5 font-bold text-accent">
                            {CATEGORIE_LABELS[v.categorie] ?? v.categorie}
                          </span>
                          <span className="text-tekst/45">{PRIO_LABEL[v.prioriteit]}</span>
                        </>
                      ) : (
                        <span className="text-tekst/35">nog niet gesorteerd</span>
                      )}
                      <span className="text-tekst/30">{korteDatum(t.gemaakt.slice(0, 10))}</span>
                    </div>
                    {v?.toelichting && (
                      <p className="mt-1.5 text-[12px] leading-[1.45] text-tekst/45">
                        ✦ {v.toelichting}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {klaar.length > 0 && (
        <>
          <div className="mt-6 text-[12px] uppercase tracking-[0.08em] text-tekst/40">Afgerond</div>
          <div className="mt-2 flex flex-col gap-1.5">
            {klaar.map((t) => (
              <div key={t.id} className="flex items-center gap-3 px-1 py-1.5">
                <button
                  type="button"
                  aria-label="Toch niet klaar"
                  onClick={() => onAfvinken(t, false)}
                  className="flex size-[22px] shrink-0 items-center justify-center rounded-full bg-accent/80 text-[12px] font-bold text-bg"
                >
                  ✓
                </button>
                <span className="min-w-0 flex-1 truncate text-[14px] text-tekst/35 line-through">
                  {t.tekst}
                </span>
                <button
                  type="button"
                  aria-label="Verwijderen"
                  onClick={() => onVerwijder(t.id)}
                  className="shrink-0 px-1 text-[15px] text-tekst/25"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <p className="mt-3 px-1 text-[11px] text-tekst/25">
            Afgeronde taken verdwijnen na {KLAAR_ZICHTBAAR_DAGEN} dagen vanzelf.
          </p>
        </>
      )}

      <TabBalk
        actief="taken"
        aantalTaken={open.length}
        onKies={(tab) => {
          if (tab === 'logboek') onTerug()
          if (tab === 'financien') onFinancien()
          if (tab === 'tracking') onTracking()
          if (tab === 'inzicht') onInzicht()
        }}
      />
    </div>
  )
}
