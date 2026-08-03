import { useCallback, useEffect, useState } from 'react'
import type { Notitie } from './types'
import { bewaarNotitie, opslag, verwijderNotitie } from './lib/opslag'
import { haalTerug, stelVraag, syncWachtrij } from './lib/github'
import Logboek, { type SyncStatus } from './schermen/Logboek'
import Editor from './schermen/Editor'
import Detail from './schermen/Detail'
import Inzicht from './schermen/Inzicht'
import Instellingen from './schermen/Instellingen'

type Scherm =
  | { naam: 'logboek' }
  | { naam: 'editor'; id?: string }
  | { naam: 'detail'; id: string }
  | { naam: 'inzicht' }
  | { naam: 'instellingen' }

export default function App() {
  const [scherm, setScherm] = useState<Scherm>({ naam: 'logboek' })
  const [notities, setNotities] = useState<Notitie[]>(() => opslag.notities())
  const [wachtend, setWachtend] = useState(() => opslag.wachtrij().length)
  const [syncBezig, setSyncBezig] = useState(false)
  const [syncFout, setSyncFout] = useState<string | undefined>()
  const [afgeleid, setAfgeleid] = useState(0) // triggert herlezen van signalen/overzichten

  const synchroniseer = useCallback(async () => {
    if (!opslag.instellingen().token) {
      setWachtend(opslag.wachtrij().length)
      return
    }
    setSyncBezig(true)
    const resultaat = await syncWachtrij()
    setWachtend(resultaat.wachtend)
    setSyncFout(resultaat.fout)
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
    setWachtend(opslag.wachtrij().length)
    setScherm({ naam: 'logboek' })
    void synchroniseer()
  }

  function verwijder(id: string) {
    setNotities(verwijderNotitie(id))
    setWachtend(opslag.wachtrij().length)
    setScherm({ naam: 'logboek' })
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
            void synchroniseer()
          }}
        />
      )

    default:
      return (
        <Logboek
          notities={notities}
          status={status}
          onNieuw={() => setScherm({ naam: 'editor' })}
          onOpen={(n) => setScherm({ naam: 'detail', id: n.id })}
          onInzicht={() => setScherm({ naam: 'inzicht' })}
          onInstellingen={() => setScherm({ naam: 'instellingen' })}
        />
      )
  }
}
