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

export type Categorie = 'prive' | 'project' | 'huis' | 'admin' | 'overig'

export const CATEGORIE_LABELS: Record<Categorie, string> = {
  prive: 'Privé',
  project: 'Project',
  huis: 'Huis',
  admin: 'Admin',
  overig: 'Overig',
}

/** Een losse taak: je dumpt 'm onbewerkt, de Mac verrijkt hem 's ochtends.
 *
 *  Bewust gescheiden van de verrijking (zie Verrijking): de app schrijft
 *  taken/<id>.json, de Mac schrijft taken/verrijking.json. Zo raken ze elkaars
 *  bestanden nooit en kunnen telefoon en Mac tegelijk werken — hetzelfde
 *  principe als notities/ versus signalen/. */
export interface Taak {
  id: string
  tekst: string
  /** ISO 8601, moment van invoeren */
  gemaakt: string
  klaar: boolean
  /** ISO 8601, moment van afvinken */
  klaarOp?: string
  bijgewerkt: string
}

/** Wat de Mac van een taak maakte (taken/verrijking.json, per taak-id). */
export interface Verrijking {
  categorie: Categorie
  /** 1 = eerst doen, 3 = mag wachten */
  prioriteit: 1 | 2 | 3
  /** Waarom deze prioriteit — zodat het geen black box is. */
  toelichting?: string
  /** YYYY-MM-DD: de dag waarop hij in de ochtendbrief staat. */
  gepland?: string
  verwerkt_op?: string
}
