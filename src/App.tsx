import { useCallback, useEffect, useState } from 'react'
import type { Gewicht as GewichtType, Herstel as HerstelType, Notitie, Schermtijd as SchermtijdType, Taak } from './types'
import {
  bewaarGewicht,
  bewaarHerstel,
  bewaarNotitie,
  bewaarSchermtijd,
  bewaarTaak,
  bewaarMeppie,
  nieuwId,
  opslag,
  verwijderNotitie,
} from './lib/opslag'
import {
  haalBijVanRepo,
  haalTerug,
  stelVraag,
  syncGewicht,
  syncHerstel,
  syncPosten,
  syncSchermtijd,
  syncTaken,
  syncWachtrij,
  syncMeppie,
} from './lib/github'
import { nuISO, vandaagISO } from './lib/datum'
import { InstellingenPagina } from './dashboard/InstellingenPagina'
import { InvulPaneel, type InvulSoort } from './dashboard/InvulPaneel'
import { Schil, type Pagina } from './dashboard/Schil'
import { Overzicht } from './dashboard/Overzicht'
import { PAGINAS } from './dashboard/Paginas'
import { LogboekPagina } from './dashboard/LogboekPagina'
import { bouwModel } from './dashboard/model'
import type { MeppieMelding } from './dashboard/typen'

/** Sinds 11 nov 2026: het dashboard (zijbalk + widgets) is de schil. Een `pagina` is alles wat
 *  in de zijbalk staat; invullen (Oura, gewicht, schermtijd) opent als paneel daarbovenop. */
type Scherm = { naam: 'pagina'; p: Pagina }

/** Alles wat nog naar GitHub moet, over alle wachtrijen heen. */
function aantalWachtend(): number {
  return (
    opslag.wachtrij().length +
    opslag.takenWachtrij().length +
    opslag.herstelWachtrij().length +
    opslag.schermtijdWachtrij().length +
    opslag.gewichtWachtrij().length +
    opslag.postenWachtrij().length +
    opslag.meppieWachtrij().length
  )
}

export default function App() {
  const [scherm, setScherm] = useState<Scherm>({ naam: 'pagina', p: 'overzicht' })
  const [paneel, setPaneel] = useState<InvulSoort | null>(null)
  const [nieuweNotitieOpen, setNieuweNotitieOpen] = useState(false)
  const naar = (p: Pagina) => {
    setScherm({ naam: 'pagina', p })
    window.scrollTo(0, 0)
  }
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
      await syncMeppie(),
    ]
    setWachtend(aantalWachtend())
    let fout = uitkomsten.find((r) => r.fout)?.fout
    try {
      await haalTerug()
      // Wat het andere toestel (telefoon/laptop) invulde, sinds 11 nov 2026.
      if (await haalBijVanRepo()) {
        setNotities(opslag.notities())
        setTaken(opslag.taken())
        setHerstel(opslag.herstel())
        setSchermtijd(opslag.schermtijd())
        setGewicht(opslag.gewicht())
        setMeppie(opslag.meppie())
      }
      setAfgeleid((n) => n + 1)
    } catch (e) {
      // Terughalen is bijvangst: een mislukking mag het opslaan niet raken, maar je moet hem wel zien.
      fout ??= e instanceof Error ? e.message : 'Ophalen uit de repo mislukt.'
    }
    setSyncFout(fout)
    opslag.zetLaatsteSync({ op: nuISO(), fout })
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

  const [meppie, setMeppie] = useState(() => opslag.meppie())
  function meppieMelden(m: MeppieMelding) {
    setMeppie(bewaarMeppie(m))
    setWachtend(aantalWachtend())
    void synchroniseer()
  }

  function taakBewaren(taak: Taak) {
    setTaken(bewaarTaak(taak))
    setWachtend(aantalWachtend())
    void synchroniseer()
  }

  /** Uit het invulpaneel: wat je aanraakte in één keer bewaren en één keer syncen. */
  function invulBewaren(w: { herstel?: HerstelType; gewicht?: GewichtType; schermtijd?: SchermtijdType }) {
    if (w.herstel) setHerstel(bewaarHerstel(w.herstel))
    if (w.gewicht) setGewicht(bewaarGewicht(w.gewicht))
    if (w.schermtijd) setSchermtijd(bewaarSchermtijd(w.schermtijd))
    setWachtend(aantalWachtend())
    setPaneel(null)
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
    notities,
    geldWeek: opslag.geldWeek(),
  })
  const invullen = (i: InvulSoort) => setPaneel(i)
  const nieuweNotitie = () => { setNieuweNotitieOpen(true); naar('logboek') }

  const inhoud = (() => {
    switch (scherm.p) {
      case 'overzicht':
        return <Overzicht key={afgeleid} m={model} onNaar={naar} onInvul={invullen} onTaakAfvinken={taakAfvinken} />
      case 'logboek':
        return (
          <LogboekPagina
            key={afgeleid}
            m={model}
            notities={notities}
            signalen={signalen}
            herstel={herstel}
            overzichten={opslag.overzicht()}
            gesteldeVragen={opslag.gesteldeVragen()}
            vraag={opslag.vraag()}
            status={status}
            startMetNieuw={nieuweNotitieOpen}
            onNieuwGestart={() => setNieuweNotitieOpen(false)}
            onOpslaan={opslaan}
            onVerwijder={verwijder}
            onVraag={stelVraag}
          />
        )
      case 'instellingen':
        return (
          <InstellingenPagina
            vandaag={vandaagISO()}
            syncBezig={syncBezig}
            syncFout={syncFout}
            onSync={() => void synchroniseer()}
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
            onTaakToevoegen={taakToevoegen} onTaakBewaar={taakBewaren} onNotitie={nieuweNotitie}
            meppie={meppie} onMeppieMelding={meppieMelden} />
        ) : null
      }
    }
  })()

  const openActies = model.rapportVanVandaag && model.rapport ? model.rapport.acties.length : 0

  return (
    <Schil
      actief={scherm.p}
      onNaar={naar}
      sync={status}
      bijgewerkt={model.brief ? model.brief.gegenereerd_op.slice(11, 16) : null}
      badges={{
        overzicht: openActies ? { t: openActies, rood: true } : undefined,
        taken: model.taken.gekozen.length ? { t: model.taken.gekozen.length } : undefined,
        mail: model.rapport?.mail ? { t: model.rapport.mail.concepten } : undefined,
      }}
    >
      {inhoud}
      {paneel && (
        <InvulPaneel soort={paneel} herstel={herstel} gewicht={gewicht} schermtijd={schermtijd}
          onBewaar={invulBewaren} onDicht={() => setPaneel(null)} />
      )}
    </Schil>
  )
}
