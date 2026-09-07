import type { ReactNode } from 'react'

/** Bouwstenen uit de designhandoff van 7 sep 2026 ("App Redesign v2").
 *  Maten en kleuren zijn daar definitief; wijk er niet van af zonder reden. */

export function Kaart({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`kaart ${className}`}>{children}</div>
}

/** Paginakop: grote titel met een regel eronder. Staat op elk hoofdscherm. */
export function PaginaKop({
  titel,
  onder,
  rechts,
}: {
  titel: string
  onder?: ReactNode
  rechts?: ReactNode
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="paginatitel">{titel}</h1>
        {onder && <div className="subtitel">{onder}</div>}
      </div>
      {rechts && <div className="mt-1 shrink-0">{rechts}</div>}
    </div>
  )
}

export function Sectiekop({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`sectiekop ${className}`}>{children}</div>
}

/** Tag-pill: blauw getint, voor categorie en type. */
export function Chip({ children, klein = false }: { children: ReactNode; klein?: boolean }) {
  return (
    <span
      className={`pil bg-chip text-chip-tekst ${
        klein ? 'px-[9px] py-[2px] text-[12px]' : 'px-[11px] py-[3px] text-[13px]'
      }`}
    >
      {children}
    </span>
  )
}

/** Ronde knop in accentkleur, de enige echte call-to-action per scherm. */
export function AccentKnop({
  children,
  onClick,
  uit = false,
  type = 'button',
  className = '',
}: {
  children: ReactNode
  onClick?: () => void
  uit?: boolean
  type?: 'button' | 'submit'
  className?: string
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={uit}
      className={`pil px-7 py-[15px] text-[15px] ${
        uit ? 'bg-uit-knop text-uit' : 'bg-accent text-inkt'
      } ${className}`}
      style={{ fontWeight: 700 }}
    >
      {children}
    </button>
  )
}

/** Kleinere knop voor in een kaart ("Zet erbij", "Bewaren"). */
export function KaartKnop({
  children,
  onClick,
  uit = false,
}: {
  children: ReactNode
  onClick?: () => void
  uit?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={uit}
      className={`pil shrink-0 px-[18px] py-[10px] text-[14px] font-semibold ${
        uit ? 'bg-uit-knop text-uit' : 'bg-accent text-inkt'
      }`}
    >
      {children}
    </button>
  )
}

/** Keuze uit twee, in een verzonken pil. Gebruikt bij eraf/erbij. */
export function Schakelaar<T extends string>({
  waarde,
  opties,
  onKies,
}: {
  waarde: T
  opties: { waarde: T; label: string }[]
  onKies: (w: T) => void
}) {
  return (
    <div className="grid grid-cols-2 gap-1.5 rounded-full bg-bg p-1" role="group">
      {opties.map((o) => {
        const aan = o.waarde === waarde
        return (
          <button
            key={o.waarde}
            type="button"
            aria-pressed={aan}
            onClick={() => onKies(o.waarde)}
            className={`rounded-full py-2 text-[14px] font-semibold transition-colors duration-150 ${
              aan ? 'bg-tekst text-[#171911]' : 'text-mut'
            }`}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

/** Chip-rij waaruit je er precies één kiest (periode in Tracking). */
export function KeuzeChips<T extends string>({
  waarde,
  opties,
  onKies,
}: {
  waarde: T
  opties: { waarde: T; label: string }[]
  onKies: (w: T) => void
}) {
  return (
    <div className="flex gap-2">
      {opties.map((o) => {
        const aan = o.waarde === waarde
        return (
          <button
            key={o.waarde}
            type="button"
            aria-pressed={aan}
            onClick={() => onKies(o.waarde)}
            className={`pil px-[15px] py-[9px] text-[13px] ${
              aan ? 'bg-accent text-inkt' : 'bg-kaart text-mut'
            }`}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

/** Afvinkrondje van een taak. */
export function Vinkje({ aan, onClick, label }: { aan: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={aan}
      aria-label={label}
      onClick={onClick}
      className={`mt-[1px] grid h-[25px] w-[25px] shrink-0 place-items-center rounded-full text-[13px] font-bold ${
        aan ? 'bg-accent text-inkt' : 'border-[1.5px] border-vink-rand'
      }`}
    >
      {aan ? '✓' : ''}
    </button>
  )
}

/** Lege staat binnen een scherm: gestippelde omtrek, gecentreerde tekst. */
export function Leeg({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-[18px] border border-dashed border-[#3A3D3A] px-4 py-[18px] text-center text-[14px] text-vaag">
      {children}
    </div>
  )
}

export type TabNaam = 'vandaag' | 'logboek' | 'tracking'

const TAB_ICOON: Record<TabNaam, (kleur: string) => ReactNode> = {
  // Zon: dit is het ochtendscherm.
  vandaag: (k) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="4" stroke={k} strokeWidth="1.8" />
      <path
        d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6L17 7M7 17l-1.4 1.4"
        stroke={k}
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  ),
  logboek: (k) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 6h14M5 12h14M5 18h9" stroke={k} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  ),
  tracking: (k) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 17a7 7 0 0 1 14 0" stroke={k} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  ),
}

/** Vaste balk onderaan. Drie schermen: lezen, vastleggen, terugkijken. */
export function TabBalk({
  actief,
  aantalTaken = 0,
  onKies,
}: {
  actief: TabNaam
  aantalTaken?: number
  onKies: (tab: TabNaam) => void
}) {
  const tabs: { naam: TabNaam; label: string }[] = [
    { naam: 'vandaag', label: 'Vandaag' },
    { naam: 'logboek', label: 'Logboek' },
    { naam: 'tracking', label: 'Tracking' },
  ]
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-20 border-t border-rand pb-[env(safe-area-inset-bottom)] backdrop-blur-[14px]"
      style={{ background: 'rgba(26,28,27,0.94)' }}
      aria-label="Hoofdmenu"
    >
      <div className="mx-auto grid max-w-[480px] grid-cols-3 pt-3 pb-2">
        {tabs.map((t) => {
          const aan = t.naam === actief
          const kleur = aan ? '#9CCBFF' : '#7C807C'
          return (
            <button
              key={t.naam}
              type="button"
              aria-current={aan ? 'page' : undefined}
              onClick={() => onKies(t.naam)}
              className="flex flex-col items-center gap-[5px]"
            >
              <span className="relative inline-flex">
                {TAB_ICOON[t.naam](kleur)}
                {t.naam === 'vandaag' && aantalTaken > 0 && (
                  <span className="absolute -top-1.5 -right-3 grid h-[18px] w-[18px] place-items-center rounded-full bg-accent text-[11px] font-bold text-inkt">
                    {aantalTaken}
                  </span>
                )}
              </span>
              <span className="text-[12px] font-semibold" style={{ color: kleur }}>
                {t.label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}

/* ---- Blijft bestaan voor de schermen die nog niet herbouwd zijn ---- */

export function Eyebrow({ children }: { children: ReactNode; accent?: boolean }) {
  return (
    <div className="text-[12px] font-semibold uppercase tracking-[0.08em] text-mut">{children}</div>
  )
}

export function Titel({ children }: { children: ReactNode }) {
  return <h1 className="paginatitel mt-1">{children}</h1>
}

export function TypeBadge({ label }: { label: string; groot?: boolean }) {
  return <Chip>{label}</Chip>
}

export function EnergieDots({ waarde, onKies }: { waarde: number; onKies?: (n: number) => void }) {
  return (
    <div className="flex gap-1.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={!onKies}
          onClick={() => onKies?.(n)}
          aria-label={`Energie ${n} van 5`}
          className={`h-2.5 w-2.5 rounded-full ${n <= waarde ? 'bg-accent' : 'bg-vink-rand'}`}
        />
      ))}
    </div>
  )
}

export function RondeKnop({
  children,
  onClick,
  label,
}: {
  children: ReactNode
  onClick: () => void
  label?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="grid h-9 w-9 place-items-center rounded-full bg-kaart text-[15px] text-mut"
    >
      {children}
    </button>
  )
}

export function AiKaart({ kop, children }: { kop: string; children: ReactNode }) {
  return (
    <div className="rounded-[18px] bg-samenhang px-4 py-[15px]">
      <div className="text-[12px] font-semibold text-samenhang-sub">{kop}</div>
      <div className="mt-2 text-[14px] leading-[1.55] text-samenhang-tekst">{children}</div>
    </div>
  )
}

export function Pil({
  children,
  aan = false,
  onClick,
}: {
  children: ReactNode
  aan?: boolean
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`pil shrink-0 px-[15px] py-[9px] text-[13px] ${
        aan ? 'bg-accent text-inkt' : 'bg-kaart text-mut'
      }`}
    >
      {children}
    </button>
  )
}
