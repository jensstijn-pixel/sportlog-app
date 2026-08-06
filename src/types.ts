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

/** De cijfers die je 's ochtends uit de Oura-app overneemt.
 *
 *  Tijdelijk handwerk: zodra de API-koppeling werkt levert die exact dezelfde
 *  velden aan, en verandert er verder niets aan de brief of de duiding.
 *  Alles behalve de datum mag ontbreken — een half ingevulde dag is nuttiger
 *  dan een lege. */
export interface Herstel {
  /** YYYY-MM-DD, de dag waarop je wakker werd */
  datum: string
  /** Slaap → Total sleep, in minuten */
  slaapMinuten: number | null
  /** Slaap-score (0–100) */
  slaapScore: number | null
  /** Readiness-score (0–100) */
  readiness: number | null
  /** Average HRV in ms */
  hrv: number | null
  /** Lowest resting heart rate */
  rusthartslag: number | null
  /** Body temperature, afwijking in °C (mag negatief) */
  tempAfwijking: number | null
  bijgewerkt: string
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

/** Alles wat het Tracking-scherm tekent. De Mac rekent het uit
 *  (scripts/tracking.py); de telefoon tekent alleen. */
export interface HerstelPunt {
  datum: string
  hrv: number | null
  slaap_min: number | null
  slaapscore: number | null
  rusthartslag: number | null
  readiness: number | null
  temp: number | null
}

export interface OefeningPunt {
  datum: string
  e1rm: number | null
  volume: number
  top_gewicht: number
  top_reps: number
  sets: number
  vlag: string | null
}

export interface SessiePunt {
  datum: string
  volume: number
  oefeningen: number
  titel: string | null
  duur_min: number | null
  energie: number | null
}

export interface Samenhang {
  n: number
  min_nodig: number
  betrouwbaar: boolean
  conclusie: string | null
  vergelijking: {
    op: string
    n_per_groep: number
    laag_grens: number
    hoog_grens: number
    volume_laag: number
    volume_hoog: number
    verschil_pct: number
  } | null
  correlaties: Record<string, number | null> | null
}

export interface Dataset {
  bijgewerkt: string
  vanaf: string
  herstel_bron?: string | null
  herstel: HerstelPunt[]
  oefeningen: Record<string, OefeningPunt[]>
  sessies: SessiePunt[]
  samenhang: Samenhang
}
