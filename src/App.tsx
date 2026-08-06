import { useCallback, useEffect, useState } from 'react'
import type { Notitie, Taak } from './types'
import { bewaarNotitie, bewaarTaak, nieuwId, opslag, verwijderNotitie, verwijderTaak } from './lib/opslag'
import { haalTerug, stelVraag, syncTaken, syncWachtrij } from './lib/github'
import { nuISO } from './lib/datum'
import Logboek, { type SyncStatus } from './schermen/Logboek'
import Editor from './schermen/Editor'
import Detail from './schermen/Detail'
import Inzicht from './schermen/Inzicht'
import Instellingen from './schermen/Instellingen'
import Taken from './schermen/Taken'

type Scherm =
  | { naam: 'logboek' }
  | { naam: 'editor'; id?: string }
  | { naam: 'detail'; id: string }
  | { naam: 'inzicht' }
  | { naam: 'instellingen' }
  | { naam: 'taken' }

export default function App() {
  const [scherm, setScherm] = useState<Scherm>({ naam: 'logboek' })
  const [notities, setNotities] = useState<Notitie[]>(() => opslag.notities())
  const [taken, setTaken] = useState<Taak[]>(() => opslag.taken())
  const [wachtend, setWachtend] = useState(
    () => opslag.wachtrij().length + opslag.takenWachtrij().length,
  )
  const [syncBezig, setSyncBezig] = useState(false)
  const [syncFout, setSyncFout] = useState<string | undefined>()
  const [afgeleid, setAfgeleid] = useState(0) // triggert herlezen van signalen/overzichten

  const synchroniseer = useCallback(async () => {
    if (!opslag.instellingen().token) {
      setWachtend(opslag.wachtrij().length + opslag.takenWachtrij().length)
      return
    }
    setSyncBezig(true)
    const notitieResultaat = await syncWachtrij()
    const taakResultaat = await syncTaken()
    setWachtend(notitieResultaat.wachtend + taakResultaat.wachtend)
    setSyncFout(notitieResultaat.fout ?? taakResultaat.fout)
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
    setWachtend(opslag.wachtrij().length + opslag.takenWachtrij().length)
    setScherm({ naam: 'logboek' })
    void synchroniseer()
  }

  function verwijder(id: string) {
    setNotities(verwijderNotitie(id))
    setWachtend(opslag.wachtrij().length + opslag.takenWachtrij().length)
    setScherm({ naam: 'logboek' })
  }

  function taakToevoegen(tekst: string) {
    const nu = nuISO()
    setTaken(bewaarTaak({ id: nieuwId(), tekst, gemaakt: nu, klaar: false, bijgewerkt: nu }))
    setWachtend(opslag.wachtrij().length + opslag.takenWachtrij().length)
    void synchroniseer()
  }

  function taakAfvinken(taak: Taak, klaar: boolean) {
    const nu = nuISO()
    setTaken(bewaarTaak({ ...taak, klaar, klaarOp: klaar ? nu : undefined, bijgewerkt: nu }))
    setWachtend(opslag.wachtrij().length + opslag.takenWachtrij().length)
    void synchroniseer()
  }

  function taakVerwijderen(id: string) {
    setTaken(verwijderTaak(id))
    setWachtend(opslag.wachtrij().length + opslag.takenWachtrij().length)
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
            void synchroniseer()
          }}
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
        />
      )
  }
}
