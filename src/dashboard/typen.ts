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
    // Sinds 11 nov 2026 (ronde Omzet):
    mix?: { groep: string; omzet: number; aandeel: number; normaal: number | null }[]
    kansen?: { categorie: string; nu: number | null; normaal: number | null; opvallend: boolean }[]
    loonReeks?: { datum: string; kosten: number | null; pct: number | null; pctZonderJens: number | null }[]
    voorstelEcht?: {
      dag: {
        perAfd: Record<'keuken' | 'bediening', { voorstel: number; echt: number; nVoorstel: number; nEcht: number }>
        mensen: { naam: string; afdeling: string; voorstel: { van: string; tot: string | null; sluit: string; kosten: number } | null; echt: { van: string; tot: string; kosten: number } | null }[]
      } | null
      sinds: string | null
      avonden: number
      totaal: { keuken: number; bediening: number }
      perAvond: { datum: string; keuken: number; bediening: number }[]
    }
    weken?: { maandag: string; omzet: number; couverts: number; dagen: number; gembes: number | null }[]
    maanden?: { maand: string; omzet: number; couverts: number; gembes: number | null; dagen: number; heel: boolean; vorigJaar: { omzet: number; couverts: number; gembes: number } | null }[]
    contract?: {
      maand: string; heel: boolean; dagen: number; collegasPct: number; metJensPct: number; jensUren: number; jensKosten: number
      contractNetto: number; contractKosten: number; contractNaarRato: number; contractUren: number
      verschilZelfdeUren: number; verschilMetVervanging: number; caseGrensPct: number
    } | null
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
  mail?: { threads: number; nieuw: number; concepten: number; regels: { wie: string; wat: string; concept: boolean; soort?: string; urgent?: boolean }[] }
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
  /** Komende groepen ≥ 12 met status (bregje-mail/groepen.json). */
  groepen?: Groep[]
  /** Wat de routine de laatste 14 dagen in Guestplan zette (reserveringen-log.md, zonder tel/mail). */
  guestplanLog?: { op: string; naam: string; datum: string | null; datumTekst: string; tijd: string; aantal: string; wat: string }[]
  /** Geschiedenis 14 dagen + de temperatuurlijst van de laatste dinsdag (bregje-mail/meppie.json). */
  meppieDetail?: {
    log: Record<string, { keuken?: string; bediening?: string; temperatuur?: string; noot?: string }>
    temperatuur: {
      datum: string; geregistreerd?: string
      items: { groep: string; item: string; product: string | null; temp: number | null; marge: string; vinkjes: boolean | null; actie: string | null; afwijking: boolean }[]
      open: { groep: string; item: string; norm?: string; wacht_op?: string }[]
    } | null
  }
}

/** Wat Jens via de app aan Meppie doorgeeft (sportlog-data/meppie/<id>.json); de routine verwerkt het. */
export interface MeppieMelding {
  id: string
  soort: 'terugkoelen' | 'afwijking'
  voorDatum: string
  gemaakt: string
  data: { product?: string; aanvang?: number; na2?: number; na5?: number; actie?: string; lijst?: string; wat?: string }
  verwerkt?: { op: string; wat: string }
}

export interface Groep {
  naam: string; datum: string; tijd: string | null; aantal: number | null
  status: string; menu: string; pdf: boolean; drank: string | null; bijzonder: string | null; open: string[]; bijgewerkt?: string
}

/** Geld en uren voor de hele week (Daily-app scripts/geld_naar_app.py → geld/week.json), bedragen in euro. */
export interface GeldWeek {
  gemaakt: string
  week: { van: string; tot: string }
  compleet: boolean
  looptTot: string
  uit: number
  in: number
  gem: number
  categorieen: { naam: string; uit: number; keer: number; gem: number }[]
  inkomsten: { naam: string; bedrag: number; keer: number }[]
  grootste: { tegenpartij: string; bedrag: number; categorie: string; datum: string }[]
  duurder: { tegenpartij: string; van: number; naar: number }[]
  gewoontes: { fastfood: { keer: number; bedrag: number; gem: number }; ah: { keer: number; bedrag: number; gem: number } }
  gewoontesReeks: { maandag: string; fastfood: number; ah: number }[]
  potjes: { netto: number; belegd: number; revolut: number }
  pot: { maand: string; op: number; budget: number; terug: number; tot: string; dagenVoorbij: number; dagenInMaand: number } | null
  maanden: { maand: string; in: number; uit: number; potjes: number; uitEten: number; fastfood: number; compleet: boolean }[]
  reflectie: string | null
  uren: { van: string; tot: string; bregje: number | null; bedrijf: number | null; perProject: [string, number][] }[]
}
