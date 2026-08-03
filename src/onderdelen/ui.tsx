import type { ReactNode } from 'react'

export function Kaart({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`kaart rounded-[16px] ${className}`}>{children}</div>
}

export function AiKaart({ kop, children }: { kop: string; children: ReactNode }) {
  return (
    <div className="ai-kaart rounded-[16px] p-4">
      <div className="flex items-center gap-[7px] text-[12px] font-bold uppercase tracking-[0.08em] text-accent">
        <span className="text-[13px]">✦</span> {kop}
      </div>
      <div className="mt-1.5 text-[13.5px] leading-[1.5] text-tekst/65">{children}</div>
    </div>
  )
}

export function Pil({
  actief,
  onClick,
  children,
  klein = false,
}: {
  actief: boolean
  onClick: () => void
  children: ReactNode
  klein?: boolean
}) {
  const maat = klein ? 'px-3 py-1.5 text-[12px]' : 'px-3.5 py-2 text-[13px]'
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 rounded-full font-semibold transition-colors ${maat} ${
        actief
          ? 'bg-accent font-bold text-bg'
          : 'border border-white/14 text-tekst/60'
      }`}
    >
      {children}
    </button>
  )
}

export function TypeBadge({ label, groot = false }: { label: string; groot?: boolean }) {
  return (
    <span
      className={`rounded-full bg-accent/14 font-bold text-accent ${
        groot ? 'px-3 py-1.5 text-[13px]' : 'px-2.5 py-1 text-[12px]'
      }`}
    >
      {label}
    </span>
  )
}

export function EnergieDots({
  waarde,
  onKies,
}: {
  waarde: number
  onKies?: (n: number) => void
}) {
  return (
    <div className="flex items-center gap-[5px]">
      {[1, 2, 3, 4, 5].map((n) => {
        const bol = (
          <span
            className={`block size-3 rounded-full ${n <= waarde ? 'bg-accent' : 'bg-white/14'}`}
          />
        )
        if (!onKies) return <span key={n}>{bol}</span>
        return (
          <button
            key={n}
            type="button"
            aria-label={`Energie ${n} van 5`}
            onClick={() => onKies(n)}
            // Onzichtbare marge eromheen: het bolletje is 12px, het raakvlak 44px.
            className="-my-4 -mx-0.5 flex h-11 w-5 items-center justify-center"
          >
            {bol}
          </button>
        )
      })}
    </div>
  )
}

export function RondeKnop({
  onClick,
  label,
  children,
  accent = false,
}: {
  onClick: () => void
  label: string
  children: ReactNode
  accent?: boolean
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={`flex size-[34px] items-center justify-center rounded-full border text-[16px] ${
        accent ? 'border-accent/40 text-accent' : 'border-white/14 text-tekst/60'
      }`}
    >
      {children}
    </button>
  )
}

export function Eyebrow({ children, accent = false }: { children: ReactNode; accent?: boolean }) {
  return <div className={`eyebrow ${accent ? 'text-accent' : 'text-tekst/50'}`}>{children}</div>
}

export function Titel({ children }: { children: ReactNode }) {
  return <h1 className="text-[32px] font-extrabold tracking-[-0.02em]">{children}</h1>
}
