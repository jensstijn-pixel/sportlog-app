import { useCallback, useEffect, useState } from 'react'
import type { Gewicht as GewichtType, Herstel as HerstelType, Notitie, Schermtijd as SchermtijdType, Taak } from './types'
import {
  bewaarGewicht,
  bewaarHerstel,
  bewaarNotitie,
  bewaarSchermtijd,
  bewaarTaak,
  nieuwId,
  opslag,
  verwijderNotitie,
} from './lib/opslag'
import {
  haalTerug,
  stelVraag,
  syncGewicht,
  syncHerstel,
  syncPosten,
  syncSchermtijd,
  syncTaken,
  syncWachtrij,
} from './lib/github'
import { gisterenISO, nuISO, vandaagISO } from './lib/datum'
import Logboek from './schermen/Logboek'
import Editor from './schermen/Editor'
import Detail from './schermen/Detail'
import Gewicht from './schermen/Gewicht'
import Inzicht from './schermen/Inzicht'
import Instellingen from './schermen/Instellingen'
import Herstel from './schermen/Herstel'
import Schermtijd from './schermen/Schermtijd'
import Tracking from './schermen/Tracking'
import { Schil, type Pagina } from './dashboard/Schil'
import { Overzicht, type Invul } from './dashboard/Overzicht'
import { PAGINAS } from './dashboard/Paginas'
import { bouwModel } from './dashboard/model'

/** Sinds 11 nov 2026: het dashboard (zijbalk + widgets) is de schil. Een `pagina` is alles wat
 *  in de zijbalk staat; de overige schermen (invullen, notitie bewerken) openen daarbovenop en
 *  gaan met "terug" naar de laatste pagina. */
type Scherm =
  | { naam: 'pagina'; p: Pagina }
  | { naam: 'editor'; id?: string; datum?: string }
  | { naam: 'detail'; id: string }
  | { naam: 'inzicht' }
  | { naam: 'herstel' }
  | { naam: 'schermtijd' }
  | { naam: 'gewicht' }

/** Het weekoverzicht van deze week, als de Mac het al geschreven heeft. */
function huidigWeekoverzicht() {
  const nu = new Date()
  const do_ = new Date(nu)
  do_.setDate(nu.getDate() - ((nu.getDay() + 6) % 7) + 3) // donderdag bepaalt het weeknummer
  const start = new Date(do_.getFullYear(), 0, 4)
  const week = 1 + Math.round(((do_.getTime() - start.getTime()) / 86400000 -
    3 + ((start.getDay() + 6) % 7)) / 7)
  const sleutel = `${do_.getFullYear()}-${String(week).padStart(2, '0')}`
  return opslag.overzicht()[sleutel]
}

/** Alles wat nog naar GitHub moet, over alle wachtrijen heen. */
function aantalWachtend(): number {
  return (
    opslag.wachtrij().length +
    opslag.takenWachtrij().length +
    opslag.herstelWachtrij().length +
    opslag.schermtijdWachtrij().length +
    opslag.gewichtWachtrij().length +
    opslag.postenWachtrij().length
  )
}

export default function App() {
  const [scherm, setScherm] = useState<Scherm>({ naam: 'pagina', p: 'overzicht' })
  const [pagina, setPagina] = useState<Pagina>('overzicht')
  const naar = (p: Pagina) => {
    setPagina(p)
    setScherm({ naam: 'pagina', p })
    window.scrollTo(0, 0)
  }
  const terug = () => setScherm({ naam: 'pagina', p: pagina })
  const [notities, setNotities] = useState<Notitie[]>(() => opslag.notities())
  const [taken, setTaken] = useState<Taak[]>(() => opslag.taken())
  const [herstel, setHerstel] = useState<Record<string, HerstelType>>(() => opslag.herstel())
  const [schermtijd, setSchermtijd] = useState<Record<string, SchermtijdType>>(() =>
    opslag.schermtijd(),
  )
  const [gewicht, setGewicht] = useState<Record<string, GewichtType>>(() => opslag.gewicht())
  const [wachtend, setWachtend] = useState(() => aantalWachtend())
  const [syncBezig, setSyncBezig] = useState(false)
  const [syncFout, setSyncFout] = useState<string | undefined>()
  const [afgeleid, setAfgeleid] = useState(0) // triggert herlezen van signalen/overzichten

  const synchroniseer = useCallback(async () => {
    if (!opslag.instellingen().token) {
      setWachtend(aantalWachtend())
      return
    }
    setSyncBezig(true)
    const uitkomsten = [
      await syncWachtrij(),
      await syncTaken(),
      await syncHerstel(),
      await syncSchermtijd(),
      await syncGewicht(),
      await syncPosten(),
    ]
    setWachtend(aantalWachtend())
    setSyncFout(uitkomsten.find((r) => r.fout)?.fout)
    try {
      await haalTerug()
      setAfgeleid((n) => n + 1)
    } catch {
      // Terughalen is bijvangst; een mislukking mag het opslaan niet raken.
    }
    setSyncBezig(false)
  }, [])

  useEffect(() => {
    void synchroniseer()
    const bijOnline = () => void synchroniseer()
    const bijZichtbaar = () => document.visibilityState === 'visible' && void synchroniseer()
    window.addEventListener('online', bijOnline)
    document.addEventListener('visibilitychange', bijZichtbaar)
    return () => {
      window.removeEventListener('online', bijOnline)
      document.removeEventListener('visibilitychange', bijZichtbaar)
    }
  }, [synchroniseer])

  function opslaan(notitie: Notitie) {
    setNotities(bewaarNotitie(notitie))
    setWachtend(aantalWachtend())
    naar('logboek')
    void synchroniseer()
  }

  function verwijder(id: string) {
    setNotities(verwijderNotitie(id))
    setWachtend(aantalWachtend())
    naar('logboek')
  }

  function taakToevoegen(tekst: string) {
    const nu = nuISO()
    setTaken(bewaarTaak({ id: nieuwId(), tekst, gemaakt: nu, klaar: false, bijgewerkt: nu }))
    setWachtend(aantalWachtend())
    void synchroniseer()
  }

  function taakAfvinken(taak: Taak, klaar: boolean) {
    const nu = nuISO()
    setTaken(bewaarTaak({ ...taak, klaar, klaarOp: klaar ? nu : undefined, bijgewerkt: nu }))
    setWachtend(aantalWachtend())
    void synchroniseer()
  }

  function herstelOpslaan(h: HerstelType) {
    setHerstel(bewaarHerstel(h))
    setWachtend(aantalWachtend())
    terug()
    void synchroniseer()
  }

  function schermtijdOpslaan(s: SchermtijdType) {
    setSchermtijd(bewaarSchermtijd(s))
    setWachtend(aantalWachtend())
    terug()
    void synchroniseer()
  }

  function gewichtOpslaan(g: GewichtType) {
    setGewicht(bewaarGewicht(g))
    setWachtend(aantalWachtend())
    terug()
    void synchroniseer()
  }

  // Eén woord over de koppeling, voor in de subtitel van het logboek.
  const status = !opslag.instellingen().token
    ? 'niet gekoppeld'
    : syncBezig
      ? 'synchroniseren…'
      : wachtend > 0
        ? `${wachtend} wacht${wachtend === 1 ? '' : 'en'}`
        : syncFout
          ? 'sync mislukt'
          : 'gesynct'

  const signalen = opslag.signalen()
  const huidige = 'id' in scherm && scherm.id ? notities.find((n) => n.id === scherm.id) : undefined

  const model = bouwModel({
    brief: opslag.brief(),
    herstel,
    gewicht,
    schermtijd,
    taken,
    verrijking: opslag.verrijking(),
    dataset: opslag.dataset(),
    bregje: opslag.bregje(),
    rapport: opslag.rapport(),
  })
  const invullen = (i: Invul) => setScherm({ naam: i })
  const nieuweNotitie = () => setScherm({ naam: 'editor' })

  const inhoud = (() => {
    switch (scherm.naam) {
      case 'editor':
        return (
          <Editor
            bestaand={huidige}
            voorDatum={scherm.datum}
            vraag={opslag.vraag()}
            onOpslaan={opslaan}
            onAnnuleer={() => (huidige ? setScherm({ naam: 'detail', id: huidige.id }) : terug())}
            onVerwijder={huidige ? verwijder : undefined}
          />
        )
      case 'detail':
        // Notitie verdwenen (verwijderd op een ander apparaat): terug naar de pagina.
        return huidige ? (
          <Detail
            notitie={huidige}
            signaal={signalen[huidige.id]}
            onTerug={terug}
            onBewerk={() => setScherm({ naam: 'editor', id: huidige.id })}
          />
        ) : null
      case 'inzicht':
        return (
          <Inzicht
            key={afgeleid}
            notities={notities}
            overzichten={opslag.overzicht()}
            gesteldeVragen={opslag.gesteldeVragen()}
            onTerug={terug}
            onVraag={stelVraag}
          />
        )
      case 'herstel':
        return <Herstel bestaand={herstel[vandaagISO()]} onOpslaan={herstelOpslaan} onTerug={terug} />
      case 'schermtijd':
        return <Schermtijd bestaand={schermtijd[gisterenISO()]} onOpslaan={schermtijdOpslaan} onTerug={terug} />
      case 'gewicht':
        return <Gewicht bestaand={gewicht[vandaagISO()]} alles={gewicht} onOpslaan={gewichtOpslaan} onTerug={terug} />
    }

    switch (scherm.p) {
      case 'overzicht':
        return <Overzicht key={afgeleid} m={model} onNaar={naar} onInvul={invullen} onTaakAfvinken={taakAfvinken} />
      case 'logboek':
        return (
          <Logboek
            key={afgeleid}
            notities={notities}
            status={status}
            taken={taken}
            verrijking={opslag.verrijking()}
            herstel={herstel}
            schermtijd={schermtijd}
            onNieuweNotitie={(datum) => setScherm({ naam: 'editor', datum })}
            onOpenNotitie={(n) => setScherm({ naam: 'detail', id: n.id })}
            onTaakToevoegen={taakToevoegen}
            onTaakAfvinken={taakAfvinken}
            onInzicht={() => setScherm({ naam: 'inzicht' })}
            onTab={() => {}}
          />
        )
      case 'tracking':
        return (
          <Tracking
            key={afgeleid}
            dataset={opslag.dataset()}
            gewicht={gewicht}
            weekoverzicht={huidigWeekoverzicht()}
            onTab={() => {}}
          />
        )
      case 'instellingen':
        return (
          <Instellingen
            aantalNotities={notities.length}
            wachtend={wachtend}
            onTerug={() => naar('overzicht')}
            onGewijzigd={() => {
              setNotities(opslag.notities())
              setTaken(opslag.taken())
              setHerstel(opslag.herstel())
              setSchermtijd(opslag.schermtijd())
              setGewicht(opslag.gewicht())
              void synchroniseer()
            }}
          />
        )
      default: {
        const P = PAGINAS[scherm.p]
        return P ? (
          <P key={afgeleid} m={model} onNaar={naar} onInvul={invullen} onTaakAfvinken={taakAfvinken}
            onTaakToevoegen={taakToevoegen} onNotitie={nieuweNotitie} />
        ) : null
      }
    }
  })()

  // Oude schermen (eigen kop, telefoonbreedte) krijgen een smalle kolom binnen de schil.
  const isOud = scherm.naam !== 'pagina' || ['logboek', 'tracking', 'instellingen'].includes(scherm.p)
  const openActies = model.rapportVanVandaag && model.rapport ? model.rapport.acties.length : 0

  return (
    <Schil
      actief={scherm.naam === 'pagina' ? scherm.p : pagina}
      onNaar={naar}
      sync={status}
      bijgewerkt={model.brief ? model.brief.gegenereerd_op.slice(11, 16) : null}
      badges={{
        overzicht: openActies ? { t: openActies, rood: true } : undefined,
        taken: model.taken.gekozen.length ? { t: model.taken.gekozen.length } : undefined,
        mail: model.rapport?.mail ? { t: model.rapport.mail.concepten } : undefined,
      }}
    >
      {isOud ? <div className="d-oud">{inhoud}</div> : inhoud}
    </Schil>
  )
}
