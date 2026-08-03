export type NotitieType = 'krachttraining' | 'hardlopen' | 'anders'

/** Snelle vlaggen: dit zijn de dingen die zó vaak terugkomen dat je ze niet
 *  wil hoeven uittypen, én die de ochtendbrief deterministisch kan gebruiken
 *  (ook als de AI-stap zou falen). */
export type Chip = 'tijdsnood' | 'pijn' | 'mindere-dag' | 'topdag'

export const CHIP_LABELS: Record<Chip, string> = {
  tijdsnood: 'Tijdsnood',
  pijn: 'Pijntje',
  'mindere-dag': 'Mindere dag',
  topdag: 'Topdag',
}

export const TYPE_LABELS: Record<NotitieType, string> = {
  krachttraining: 'Krachttraining',
  hardlopen: 'Hardlopen',
  anders: 'Anders',
}

export interface Notitie {
  id: string
  /** YYYY-MM-DD */
  datum: string
  /** ISO 8601 met tijdzone, moment van eerste opslaan */
  tijdstip: string
  type: NotitieType
  /** null = de Mac vult 'm aan uit Hevy */
  duurMinuten: number | null
  /** 1–5 */
  energie: number
  titel?: string
  tekst: string
  chips: Chip[]
  bijgewerkt: string
}

/** Wat de AI-stap op de Mac van een notitie maakte (signalen/<id>.json). */
export interface Signaal {
  notitie_id: string
  datum: string
  samenvatting: string
  vlaggen: {
    oefening: string | null
    soort: string
    reden?: string
    uitsluiten_van_progressie?: boolean
    actie?: string
  }[]
  verwerkt_op?: string
}

/** Weekoverzicht, geschreven door de Mac (overzicht/week-JJJJ-WW.json). */
export interface Weekoverzicht {
  week: number
  jaar: number
  van: string
  tot: string
  samenvatting: string
  gegenereerd_op?: string
  /** Antwoorden op vragen die vanuit de app gesteld zijn. */
  antwoorden?: { vraag: string; antwoord: string; op: string }[]
}

/** Vraag die de ochtendbrief aan Jens stelt (vraag/open.json). */
export interface OpenVraag {
  vraag: string
  gesteld_op: string
  /** Waar de vraag over gaat, puur ter herkenning. */
  context?: string
}
