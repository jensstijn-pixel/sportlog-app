import { CHIP_LABELS, TYPE_LABELS, type Notitie, type Signaal } from '../types'
import { eyebrowDatum } from '../lib/datum'
import { AiKaart, Eyebrow, TypeBadge } from '../onderdelen/ui'

export default function Detail({
  notitie,
  signaal,
  onTerug,
  onBewerk,
}: {
  notitie: Notitie
  signaal?: Signaal
  onTerug: () => void
  onBewerk: () => void
}) {
  return (
    <div className="min-h-dvh px-5 pt-[calc(env(safe-area-inset-top)+12px)] pb-10">
      <div className="flex items-center justify-between py-2">
        <button type="button" onClick={onTerug} className="text-[15px] text-tekst/50">
          ‹ Logboek
        </button>
        <button type="button" onClick={onBewerk} className="text-[15px] font-bold text-accent">
          Bewerk
        </button>
      </div>

      <div className="mt-4">
        <Eyebrow accent>{eyebrowDatum(notitie.datum)}</Eyebrow>
        <h1 className="mt-1 text-[30px] font-extrabold tracking-[-0.02em]">
          {notitie.titel ?? TYPE_LABELS[notitie.type]}
        </h1>
      </div>

      <div className="mt-3.5 flex flex-wrap items-center gap-2">
        <TypeBadge groot label={TYPE_LABELS[notitie.type]} />
        {notitie.duurMinuten && (
          <>
            <span className="text-[13px] text-tekst/50">{notitie.duurMinuten} min</span>
            <span className="text-[13px] text-tekst/50">·</span>
          </>
        )}
        <span className="text-[13px] text-tekst/50">energie {notitie.energie}/5</span>
      </div>

      {notitie.chips.length > 0 && (
        <div className="mt-2.5 flex flex-wrap gap-2">
          {notitie.chips.map((c) => (
            <span
              key={c}
              className="rounded-full border border-white/14 px-3 py-1.5 text-[12px] font-semibold text-tekst/60"
            >
              {CHIP_LABELS[c]}
            </span>
          ))}
        </div>
      )}

      <div className="kaart mt-4 whitespace-pre-wrap rounded-[16px] p-[18px] text-[16px] leading-[1.65] text-notitie">
        {notitie.tekst}
      </div>

      <div className="mt-3">
        {signaal ? (
          <AiKaart kop="AI leest mee">
            <p>{signaal.samenvatting}</p>
            {signaal.vlaggen.length > 0 && (
              <ul className="mt-2 flex flex-col gap-1">
                {signaal.vlaggen.map((v, i) => (
                  <li key={i} className="text-tekst/75">
                    <span className="text-accent">·</span> {v.oefening ? `${v.oefening} — ` : ''}
                    {v.soort}
                    {v.reden ? ` (${v.reden})` : ''}
                    {v.actie ? ` → ${v.actie}` : ''}
                  </li>
                ))}
              </ul>
            )}
          </AiKaart>
        ) : (
          <AiKaart kop="AI leest mee">
            Deze notitie telt mee in je weekoverzicht. Hij wordt verwerkt bij je volgende
            ochtendbrief.
          </AiKaart>
        )}
      </div>
    </div>
  )
}
