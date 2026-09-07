import { useCallback, useEffect, useState } from 'react'
import type { Herstel as HerstelType, Notitie, Post, Richting, Schermtijd as SchermtijdType, Taak } from './types'
import {
  bewaarHerstel,
  bewaarNotitie,
  bewaarPost,
  bewaarSchermtijd,
  bewaarTaak,
  nieuwId,
  opslag,
  verwijderNotitie,
  verwijderPost,
  verwijderTaak,
} from './lib/opslag'
import { haalTerug, stelVraag, syncHerstel, syncPosten, syncSchermtijd, syncTaken, syncWachtrij } from './lib/github'
import { gisterenISO, nuISO, vandaagISO } from './lib/datum'
import Logboek, { type SyncStatus } from './schermen/Logboek'
import Editor from './schermen/Editor'
import Detail from './schermen/Detail'
import Inzicht from './schermen/Inzicht'
import Instellingen from './schermen/Instellingen'
import Taken from './schermen/Taken'
import Herstel from './schermen/Herstel'
import Schermtijd from './schermen/Schermtijd'
import Tracking from './schermen/Tracking'
import Financien from './schermen/Financien'

type Scherm =
  | { naam: 'logboek' }
  | { naam: 'editor'; id?: string }
  | { naam: 'detail'; id: string }
  | { naam: 'inzicht' }
  | { naam: 'instellingen' }
  | { naam: 'taken' }
  | { naam: 'herstel' }
  | { naam: 'schermtijd' }
  | { naam: 'tracking' }
  | { naam: 'financien' }

/** Alles wat nog naar GitHub moet, over alle wachtrijen heen. */
function aantalWachtend(): number {
  return (
    opslag.wachtrij().length +
    opslag.takenWachtrij().length +
    opslag.herstelWachtrij().length +
    opslag.schermtijdWachtrij().length +
    opslag.postenWachtrij().length
  )
}

export default function App() {
  const [scherm, setScherm] = useState<Scherm>({ naam: 'logboek' })
  const [notities, setNotities] = useState<Notitie[]>(() => opslag.notities())
  const [taken, setTaken] = useState<Taak[]>(() => opslag.taken())
  const [herstel, setHerstel] = useState<Record<string, HerstelType>>(() => opslag.herstel())
  const [schermtijd, setSchermtijd] = useState<Record<string, SchermtijdType>>(() =>
    opslag.schermtijd(),
  )
  const [posten, setPosten] = useState<Post[]>(() => opslag.posten())
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
    setScherm({ naam: 'logboek' })
    void synchroniseer()
  }

  function verwijder(id: string) {
    setNotities(verwijderNotitie(id))
    setWachtend(aantalWachtend())
    setScherm({ naam: 'logboek' })
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

  function taakVerwijderen(id: string) {
    setTaken(verwijderTaak(id))
    setWachtend(aantalWachtend())
  }

  function postToevoegen(invoer: {
    datum: string
    bedragCent: number
    richting: Richting
    tekst: string
  }) {
    const nu = nuISO()
    setPosten(bewaarPost({ id: nieuwId(), ...invoer, tijdstip: nu, bijgewerkt: nu }))
    setWachtend(aantalWachtend())
    void synchroniseer()
  }

  function postVerwijderen(id: string) {
    setPosten(verwijderPost(id))
    setWachtend(aantalWachtend())
  }

  function herstelOpslaan(h: HerstelType) {
    setHerstel(bewaarHerstel(h))
    setWachtend(aantalWachtend())
    setScherm({ naam: 'logboek' })
    void synchroniseer()
  }

  function schermtijdOpslaan(s: SchermtijdType) {
    setSchermtijd(bewaarSchermtijd(s))
    setWachtend(aantalWachtend())
    setScherm({ naam: 'logboek' })
    void synchroniseer()
  }

  const status: SyncStatus = !opslag.instellingen().token
    ? { tekst: '○ niet gekoppeld — tik hier', soort: 'aandacht' }
    : syncBezig
      ? { tekst: '· synchroniseren…', soort: 'bezig' }
      : wachtend > 0
        ? { tekst: `● ${wachtend} wacht${wachtend === 1 ? '' : 'en'} op verbinding`, soort: 'aandacht' }
        : syncFout
          ? { tekst: `● ${syncFout}`, soort: 'aandacht' }
          : { tekst: '✓ gesynct', soort: 'goed' }

  const signalen = opslag.signalen()
  const huidige = 'id' in scherm && scherm.id ? notities.find((n) => n.id === scherm.id) : undefined

  // Notitie verdwenen (verwijderd op een ander apparaat): val terug op het logboek.
  const actief: Scherm = scherm.naam === 'detail' && !huidige ? { naam: 'logboek' } : scherm

  switch (actief.naam) {
    case 'editor':
      return (
        <Editor
          bestaand={huidige}
          vraag={opslag.vraag()}
          onOpslaan={opslaan}
          onAnnuleer={() => setScherm(huidige ? { naam: 'detail', id: huidige.id } : { naam: 'logboek' })}
          onVerwijder={huidige ? verwijder : undefined}
        />
      )

    case 'detail':
      return huidige ? (
        <Detail
          notitie={huidige}
          signaal={signalen[huidige.id]}
          onTerug={() => setScherm({ naam: 'logboek' })}
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
          onTerug={() => setScherm({ naam: 'logboek' })}
          onVraag={stelVraag}
        />
      )

    case 'instellingen':
      return (
        <Instellingen
          aantalNotities={notities.length}
          wachtend={wachtend}
          onTerug={() => setScherm({ naam: 'logboek' })}
          onGewijzigd={() => {
            setNotities(opslag.notities())
            setTaken(opslag.taken())
            setPosten(opslag.posten())
            void synchroniseer()
          }}
        />
      )

    case 'herstel':
      return (
        <Herstel
          bestaand={herstel[vandaagISO()]}
          onOpslaan={herstelOpslaan}
          onTerug={() => setScherm({ naam: 'logboek' })}
        />
      )

    case 'schermtijd':
      return (
        <Schermtijd
          bestaand={schermtijd[gisterenISO()]}
          onOpslaan={schermtijdOpslaan}
          onTerug={() => setScherm({ naam: 'logboek' })}
        />
      )

    case 'tracking':
      return (
        <Tracking
          key={afgeleid}
          dataset={opslag.dataset()}
          onTerug={() => setScherm({ naam: 'logboek' })}
          onTaken={() => setScherm({ naam: 'taken' })}
          onFinancien={() => setScherm({ naam: 'financien' })}
        />
      )

    case 'financien':
      return (
        <Financien
          key={afgeleid}
          posten={posten}
          duiding={opslag.financienDuiding()}
          onToevoegen={postToevoegen}
          onVerwijder={postVerwijderen}
          onTerug={() => setScherm({ naam: 'logboek' })}
          onTaken={() => setScherm({ naam: 'taken' })}
          onTracking={() => setScherm({ naam: 'tracking' })}
          onInzicht={() => setScherm({ naam: 'inzicht' })}
        />
      )

    case 'taken':
      return (
        <Taken
          key={afgeleid}
          taken={taken}
          verrijking={opslag.verrijking()}
          onToevoegen={taakToevoegen}
          onAfvinken={taakAfvinken}
          onVerwijder={taakVerwijderen}
          onTerug={() => setScherm({ naam: 'logboek' })}
          onInzicht={() => setScherm({ naam: 'inzicht' })}
          onTracking={() => setScherm({ naam: 'tracking' })}
          onFinancien={() => setScherm({ naam: 'financien' })}
        />
      )

    default:
      return (
        <Logboek
          notities={notities}
          status={status}
          openTaken={taken.filter((t) => !t.klaar).length}
          onNieuw={() => setScherm({ naam: 'editor' })}
          onOpen={(n) => setScherm({ naam: 'detail', id: n.id })}
          onInzicht={() => setScherm({ naam: 'inzicht' })}
          onInstellingen={() => setScherm({ naam: 'instellingen' })}
          onTaken={() => setScherm({ naam: 'taken' })}
          onTracking={() => setScherm({ naam: 'tracking' })}
          onFinancien={() => setScherm({ naam: 'financien' })}
          herstelVandaag={herstel[vandaagISO()]}
          onHerstel={() => setScherm({ naam: 'herstel' })}
          schermtijdGisteren={schermtijd[gisterenISO()]}
          onSchermtijd={() => setScherm({ naam: 'schermtijd' })}
        />
      )
  }
}
