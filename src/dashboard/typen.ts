/** Wat de Mac voor het dashboard klaarzet (sinds 11 nov 2026).
 *
 *  - `bregje/vandaag.json`: Omzet-app (`npm run app`) — omzet, loon, bezetting.
 *  - `rapport/vandaag.json`: /ochtendroutine (`scripts/rapport_naar_app.py`) — mail, Guestplan,
 *    Meppie, "Jouw actie". Formaat staat ook in sportlog-data/README.md.
 *  De app rekent hier niets aan; hij toont het. */

export interface BregjeDienst { naam: string; van: string; tot: string; uren: number; kosten: number }
export interface VoorstelPersoon { naam: string; afdeling: string; van: string; tot: string | null; uren: number; kosten: number; rollen?: string[] }
export interface RoosterPersoon { naam: string; afdeling: string; van: string; tot: string; uren: number; kosten: number; rol: string }
export interface VoorstelVersie { tijd: string; kosten: number; pct: number | null; toelichting: string | null; mensen: { naam: string; afdeling: string; van: string; tot: string | null; kosten: number; rol: string }[] }

export interface Bregje {
  gemaakt: string
  gisteren: {
    datum: string
    weekdag: number
    couverts: number
    omzet: number
    omzetEx: number
    gembes: number
    gemWeekdag: number | null
    besteVan: number | null
    gembesReeks: { datum: string; gembes: number }[]
    omzetReeks: { datum: string; omzet: number }[]
    loon: { kosten: number; uren: number; mensen: number; pct: number; doelPct: number; budget: number } | null
    diensten: BregjeDienst[]
    regels: string[]
  } | null
  vandaag: {
    datum: string
    reservering: { gasten: number; aantal: number | null; gelezenOp: string } | null
    verwacht: { gasten: number; omzetEx: number; budget: number; uitleg: string }
    sluit: { keuken: string | null; bediening: string | null }
    voorstel: { kosten: number; pct: number | null; mensen: VoorstelPersoon[] } | null
    /** Sinds 11 nov 2026: het rooster uit de personeelsapp (null als die niet bereikbaar was). */
    rooster?: { kosten: number; pct: number | null; mensen: RoosterPersoon[] } | null
    /** Sinds 11 nov 2026: elke vastgelegde versie van het voorstel, oud → nieuw. */
    versies?: VoorstelVersie[]
  }
}

export interface RapportActie { tekst: string; bron?: string; urgent?: boolean }

export interface Rapport {
  datum: string
  gemaakt?: string
  status?: { onderdeel: string; stand: 'gelukt' | 'deels' | 'niet'; reden?: string }[]
  vandaag?: string
  acties: RapportActie[]
  mail?: { threads: number; nieuw: number; concepten: number; regels: { wie: string; wat: string; concept: boolean }[] }
  guestplan?: { naam: string; datum: string; tijd: string; aantal: number; tafel?: string; actie: string; was?: string; opmerking?: string }[]
  wachtOp?: string[]
  nietIngevoerd?: string[]
  dag?: { reserveringen: number; gasten: number; groepen: { naam: string; aantal: number; tijd: string; menu: boolean }[]; allergieen: string[]; wensen: string[]; menus: string[] }
  komend?: { datum: string; naam: string; menu: boolean; noot?: string }[]
  meppie?: { label: string; waarde: string; ok: boolean }[]
  bezettingNoot?: string
  /** Gasten en tafels die per kwartier binnenkomen (vandaag). */
  aankomsten?: { tijd: string; gasten: number; tafels?: number }[]
  /** Guestplan-tellers van de komende dagen. */
  vooruit?: { datum: string; reserveringen: number; gasten: number; groepen?: { naam: string; aantal: number; tijd: string; menu: boolean }[] }[]
}
