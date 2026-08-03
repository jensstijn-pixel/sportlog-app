import { useState } from 'react'
import { CHIP_LABELS, TYPE_LABELS, type Chip, type Notitie, type NotitieType, type OpenVraag } from '../types'
import { eyebrowDatum, nuISO, vandaagISO } from '../lib/datum'
import { nieuwId } from '../lib/opslag'
import { EnergieDots, Eyebrow, Pil } from '../onderdelen/ui'

const TYPES: NotitieType[] = ['krachttraining', 'hardlopen', 'anders']
const CHIPS: Chip[] = ['tijdsnood', 'pijn', 'mindere-dag', 'topdag']

export default function Editor({
  bestaand,
  vraag,
  onOpslaan,
  onAnnuleer,
  onVerwijder,
}: {
  bestaand?: Notitie
  vraag: OpenVraag | null
  onOpslaan: (n: Notitie) => void
  onAnnuleer: () => void
  onVerwijder?: (id: string) => void
}) {
  const [type, setType] = useState<NotitieType>(bestaand?.type ?? 'krachttraining')
  const [duur, setDuur] = useState(bestaand?.duurMinuten ? String(bestaand.duurMinuten) : '')
  const [energie, setEnergie] = useState(bestaand?.energie ?? 4)
  const [titel, setTitel] = useState(bestaand?.titel ?? '')
  const [tekst, setTekst] = useState(bestaand?.tekst ?? '')
  const [chips, setChips] = useState<Chip[]>(bestaand?.chips ?? [])

  const datum = bestaand?.datum ?? vandaagISO()
  const kanOpslaan = tekst.trim().length > 0 || chips.length > 0

  function wisselChip(c: Chip) {
    setChips((huidig) => (huidig.includes(c) ? huidig.filter((x) => x !== c) : [...huidig, c]))
  }

  function opslaan() {
    if (!kanOpslaan) return
    const nu = nuISO()
    const minuten = duur.trim() ? Number(duur) : NaN
    onOpslaan({
      id: bestaand?.id ?? nieuwId(),
      datum,
      tijdstip: bestaand?.tijdstip ?? nu,
      type,
      duurMinuten: Number.isFinite(minuten) && minuten > 0 ? Math.round(minuten) : null,
      energie,
      titel: titel.trim() || undefined,
      tekst: tekst.trim(),
      chips,
      bijgewerkt: nu,
    })
  }

  return (
    <div className="flex h-dvh flex-col px-5 pt-[calc(env(safe-area-inset-top)+12px)]">
      <div className="flex items-center justify-between py-2">
        <button type="button" onClick={onAnnuleer} className="text-[15px] text-tekst/50">
          Annuleer
        </button>
        <button
          type="button"
          onClick={opslaan}
          disabled={!kanOpslaan}
          className={`text-[15px] font-bold ${kanOpslaan ? 'text-accent' : 'text-tekst/25'}`}
        >
          Opslaan
        </button>
      </div>

      <div className="mt-3.5">
        <Eyebrow accent>{eyebrowDatum(datum)}</Eyebrow>
        <input
          value={titel}
          onChange={(e) => setTitel(e.target.value)}
          placeholder={bestaand ? 'Zonder titel' : 'Nieuwe notitie'}
          enterKeyHint="next"
          className="mt-1 w-full text-[30px] font-extrabold tracking-[-0.02em] placeholder:text-tekst"
        />
      </div>

      <div className="mt-4 flex gap-2">
        {TYPES.map((t) => (
          <Pil key={t} actief={type === t} onClick={() => setType(t)}>
            {TYPE_LABELS[t]}
          </Pil>
        ))}
      </div>

      <div className="mt-3 flex gap-2.5">
        <label className="kaart flex-1 rounded-[14px] px-3.5 py-2.5">
          <span className="block text-[11px] uppercase tracking-[0.08em] text-tekst/45">Duur</span>
          <span className="mt-0.5 flex items-baseline gap-1">
            <input
              value={duur}
              onChange={(e) => setDuur(e.target.value.replace(/\D/g, '').slice(0, 3))}
              inputMode="numeric"
              placeholder="—"
              className="w-10 text-[17px] font-bold"
            />
            <span className="text-[17px] font-bold text-tekst/45">min</span>
          </span>
        </label>
        <div className="kaart flex-1 rounded-[14px] px-3.5 py-2.5">
          <span className="block text-[11px] uppercase tracking-[0.08em] text-tekst/45">Energie</span>
          <div className="mt-[7px]">
            <EnergieDots waarde={energie} onKies={setEnergie} />
          </div>
        </div>
      </div>

      <div className="geen-balk -mx-5 mt-2.5 flex gap-2 overflow-x-auto px-5">
        {CHIPS.map((c) => (
          <Pil key={c} klein actief={chips.includes(c)} onClick={() => wisselChip(c)}>
            {CHIP_LABELS[c]}
          </Pil>
        ))}
      </div>

      {vraag && !bestaand && (
        <div className="ai-kaart mt-2.5 rounded-[14px] px-4 py-3">
          <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-accent">
            ✦ Uit je ochtendbrief
          </div>
          <p className="mt-1 text-[13.5px] leading-[1.45] text-tekst/75">{vraag.vraag}</p>
        </div>
      )}

      <textarea
        value={tekst}
        onChange={(e) => setTekst(e.target.value)}
        autoFocus={!bestaand}
        placeholder="Hoe ging het? Wat viel op? Wat moet ik volgende keer weten?"
        className="kaart mt-3 mb-3 min-h-32 flex-1 resize-none rounded-[16px] px-4 py-3.5 text-[16px] leading-[1.55] text-notitie"
      />

      {bestaand && onVerwijder && (
        <button
          type="button"
          onClick={() => onVerwijder(bestaand.id)}
          className="mb-[calc(env(safe-area-inset-bottom)+10px)] text-[13px] text-tekst/40"
        >
          Notitie verwijderen
        </button>
      )}
    </div>
  )
}
