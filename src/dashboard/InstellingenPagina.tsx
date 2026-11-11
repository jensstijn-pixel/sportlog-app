import { useState, type ReactNode } from 'react'
import {
  controleer,
  herstelGewichtVanRepo,
  herstelHerstelVanRepo,
  herstelPostenVanRepo,
  herstelSchermtijdVanRepo,
  herstelTakenVanRepo,
  herstelVanRepo,
} from '../lib/github'
import { meldingStand, testMelding, zetMeldingenAan } from '../lib/melding'
import { opslag } from '../lib/opslag'
import { korteDag } from './model'

/** Instellingen in de stijl van het dashboard (sinds 11 nov 2026): syncstatus, koppeling met
 *  ingekorte token, waarschuwing over het beginscherm, ochtendmelding en de versie van deze build. */

/** Bouwtijd in lokale tijd als "JJJJ-MM-DDTUU:MM", zodat tijdstip() hem kan tonen. */
const GEBOUWD = new Date(__GEBOUWD__).toLocaleString('sv-SE').replace(' ', 'T')

const meervoud = (n: number, een: string, meer: string) => `${n} ${n === 1 ? een : meer}`

function Rij({ l, w, wc = '', s }: { l: ReactNode; w?: ReactNode; wc?: string; s?: ReactNode }) {
  return (
    <div className="d-rij">
      <span className="tekst">{l}{s != null && <small>{s}</small>}</span>
      {w != null && <span className={`waarde ${wc}`}>{w}</span>}
    </div>
  )
}

function tijdstip(iso: string, vandaag: string): string {
  const dag = iso.slice(0, 10)
  return `${dag === vandaag ? 'vandaag' : korteDag(dag)} ${iso.slice(11, 16)}`
}

export function InstellingenPagina({
  vandaag, syncBezig, syncFout, onSync, onGewijzigd,
}: {
  vandaag: string
  syncBezig: boolean
  syncFout?: string
  onSync: () => void
  onGewijzigd: () => void
}) {
  const huidig = opslag.instellingen()
  const [wijzig, setWijzig] = useState(!huidig.token)
  const [token, setToken] = useState(huidig.token)
  const [owner, setOwner] = useState(huidig.owner)
  const [repo, setRepo] = useState(huidig.repo)
  const [melding, setMelding] = useState<{ tekst: string; goed: boolean } | null>(null)
  const [bezig, setBezig] = useState(false)
  const [stand, setStand] = useState(meldingStand)

  const laatste = opslag.laatsteSync()
  const fout = syncFout ?? laatste?.fout
  const wacht = [
    [opslag.wachtrij().length, 'notitie', 'notities'],
    [opslag.takenWachtrij().length, 'taak', 'taken'],
    [opslag.herstelWachtrij().length, 'dag herstel', 'dagen herstel'],
    [opslag.schermtijdWachtrij().length, 'dag schermtijd', 'dagen schermtijd'],
    [opslag.gewichtWachtrij().length, 'weging', 'wegingen'],
    [opslag.postenWachtrij().length, 'geldpost', 'geldposten'],
    [opslag.meppieWachtrij().length, 'Meppie-melding', 'Meppie-meldingen'],
  ] as const
  const wachtTekst = wacht.filter(([n]) => n > 0).map(([n, e, m]) => meervoud(n, e, m)).join(' · ')
  const gekoppeld = !!huidig.token
  const status = !gekoppeld ? 'Niet gekoppeld' : syncBezig ? 'Synchroniseren…' : fout ? 'Mislukt' : wachtTekst ? 'Wacht nog' : 'Bij'
  const statusKleur = !gekoppeld || fout ? 'd-slecht' : wachtTekst ? 'd-let' : 'd-goed'

  async function bewaarEnTest() {
    setBezig(true)
    setMelding(null)
    const inst = { token: token.trim(), owner: owner.trim(), repo: repo.trim() }
    opslag.zetInstellingen(inst)
    const uitkomst = await controleer(inst)
    setMelding(uitkomst.ok ? { tekst: 'Gekoppeld. Alles wat je invult gaat voortaan vanzelf naar de Mac.', goed: true } : { tekst: uitkomst.fout, goed: false })
    if (uitkomst.ok) setWijzig(false)
    setBezig(false)
    onGewijzigd()
  }

  /** Alles terughalen wat in de repo staat maar nog niet op dit toestel. */
  async function terughalen() {
    setBezig(true)
    setMelding(null)
    try {
      const [notities, taken, posten, herstelDagen, schermDagen, gewichtDagen] = await Promise.all([
        herstelVanRepo(), herstelTakenVanRepo(), herstelPostenVanRepo(),
        herstelHerstelVanRepo(), herstelSchermtijdVanRepo(), herstelGewichtVanRepo(),
      ])
      const delen = [
        notities ? meervoud(notities, 'notitie', 'notities') : null,
        taken ? meervoud(taken, 'taak', 'taken') : null,
        posten ? meervoud(posten, 'geldpost', 'geldposten') : null,
        herstelDagen ? meervoud(herstelDagen, 'dag slaap', 'dagen slaap') : null,
        schermDagen ? meervoud(schermDagen, 'dag schermtijd', 'dagen schermtijd') : null,
        gewichtDagen ? meervoud(gewichtDagen, 'dag gewicht', 'dagen gewicht') : null,
      ].filter(Boolean)
      setMelding({ tekst: delen.length ? `${delen.join(', ')} teruggehaald.` : 'Niets nieuws gevonden, je bent bij.', goed: true })
      onGewijzigd()
    } catch (e) {
      setMelding({ tekst: e instanceof Error ? e.message : 'Ophalen mislukt.', goed: false })
    } finally {
      setBezig(false)
    }
  }

  async function meldingenAan() {
    setBezig(true)
    setMelding(null)
    const uitkomst = await zetMeldingenAan()
    setMelding({ tekst: uitkomst.tekst, goed: uitkomst.ok })
    setStand(meldingStand())
    setBezig(false)
  }

  const kort = huidig.token ? `${huidig.token.slice(0, 11)}…${huidig.token.slice(-4)}` : null

  return (
    <div className="d-pagina smal">
      <h1 className="d-h1">Instellingen</h1>
      <p className="d-sub">Daily · versie van {tijdstip(GEBOUWD, vandaag)}</p>

      {/* Synchronisatie */}
      <h2 className="d-h2">Synchronisatie</h2>
      <div className="d-lijst">
        <Rij l="Status" w={status} wc={statusKleur} />
        <Rij l={fout ? "Laatste poging" : "Laatste sync"} w={laatste ? tijdstip(laatste.op, vandaag) : 'nog nooit'} />
        <Rij l="Wacht nog" s={wachtTekst || undefined} w={wachtTekst ? undefined : 'niets'} />
        {fout && <Rij l="Laatste fout" s={<span className="d-slecht">{fout}</span>} />}
      </div>
      <div className="d-knoppen" style={{ marginTop: 12 }}>
        <button type="button" className="d-knop" disabled={!gekoppeld || syncBezig || bezig} onClick={onSync}>
          {syncBezig ? 'Bezig…' : 'Nu synchroniseren'}
        </button>
        <button type="button" className="d-knop zacht" disabled={!gekoppeld || bezig} onClick={terughalen}>Alles terughalen uit de repo</button>
      </div>
      <p className="d-voetnoot">De app synct vanzelf bij openen en zodra je weer online bent. "Terughalen" is voor als dit toestel iets mist dat wel in de repo staat.</p>

      {melding && <p className="d-voetnoot" style={{ marginTop: 12, color: melding.goed ? 'var(--green)' : 'var(--red)' }}>{melding.tekst}</p>}

      {/* Koppeling */}
      <h2 className="d-h2" style={{ marginTop: 28 }}>Koppeling</h2>
      {!wijzig ? (
        <div className="d-lijst">
          <Rij l="Token" w={<span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 13 }}>{kort}</span>} />
          <Rij l="Repo" w={`${huidig.owner}/${huidig.repo}`} />
          <button type="button" className="d-rij" onClick={() => setWijzig(true)}><span className="tekst" style={{ color: 'var(--blue)' }}>Wijzigen</span></button>
        </div>
      ) : (
        <div className="d-tekstblok d-formulier" style={{ whiteSpace: 'normal', gridTemplateColumns: '1fr 1fr' }}>
          <label className="breed">GitHub-token
            <input value={token} onChange={(e) => setToken(e.target.value)} type="password" autoComplete="off" autoCapitalize="off" autoCorrect="off" spellCheck={false} placeholder="github_pat_…" />
          </label>
          <label>Eigenaar<input value={owner} onChange={(e) => setOwner(e.target.value)} autoCapitalize="off" autoCorrect="off" /></label>
          <label>Repo<input value={repo} onChange={(e) => setRepo(e.target.value)} autoCapitalize="off" autoCorrect="off" /></label>
          <div className="d-knoppen breed" style={{ marginTop: 4 }}>
            <button type="button" className="d-knop" disabled={bezig || !token.trim()} onClick={bewaarEnTest}>{bezig ? 'Even geduld…' : 'Bewaren en testen'}</button>
            {gekoppeld && <button type="button" className="d-knop zacht" onClick={() => { setToken(huidig.token); setOwner(huidig.owner); setRepo(huidig.repo); setWijzig(false) }}>Annuleren</button>}
          </div>
        </div>
      )}
      <section className="d-duiding" style={{ marginTop: 12 }}>
        <p style={{ margin: 0, fontSize: 14, lineHeight: 1.45 }}>
          <b style={{ color: 'var(--orange)' }}>Haal Daily niet van je beginscherm.</b> iOS wist dan alles wat de app bewaart, ook je token.
          Wat al gesynct is staat veilig in de repo, maar het token moet je dan opnieuw invullen.
        </p>
      </section>

      <details className="d-uitleg" open={!gekoppeld} style={{ marginTop: 12 }}>
        <summary>Een token maken</summary>
        <ol>
          <li>github.com → Settings → Developer settings → Personal access tokens → <b>Fine-grained tokens</b>.</li>
          <li>"Generate new token", alleen de repo <b>{repo}</b> selecteren.</li>
          <li>Repository permissions: <b>Contents</b> op <b>Read and write</b>. Meer heeft hij niet nodig.</li>
          <li>Token kopiëren en hierboven plakken.</li>
        </ol>
        <p>Het token blijft op dit toestel en gaat nergens anders heen dan naar GitHub.</p>
      </details>

      {/* Ochtendmelding */}
      <h2 className="d-h2" style={{ marginTop: 28 }}>Ochtendmelding</h2>
      <div className="d-lijst">
        <Rij l="Melding" w={stand === 'aan' ? 'aan' : stand === 'geweigerd' ? 'geweigerd' : stand === 'kan-niet' ? 'niet mogelijk' : 'uit'}
          wc={stand === 'aan' ? 'd-goed' : stand === 'geweigerd' ? 'd-slecht' : ''} />
      </div>
      <p className="d-voetnoot">
        {stand === 'aan' ? 'Je krijgt \'s ochtends een melding zodra de Mac je brief heeft gemaakt.'
          : stand === 'geweigerd' ? 'Terugzetten kan alleen via Instellingen → Meldingen → Daily op je telefoon.'
            : stand === 'kan-niet' ? 'Dit toestel kan geen meldingen tonen. Op de iPhone werkt het alleen als Daily op je beginscherm staat.'
              : 'Eén melding per ochtend, rond de tijd dat je brief klaar is. Je telefoon vraagt één keer om toestemming: tik op toestaan.'}
      </p>
      <div className="d-knoppen" style={{ marginTop: 10 }}>
        {stand === 'aan' && <button type="button" className="d-knop zacht" onClick={() => void testMelding()}>Testmelding tonen</button>}
        {stand !== 'aan' && stand !== 'geweigerd' && stand !== 'kan-niet' && <button type="button" className="d-knop" disabled={bezig} onClick={meldingenAan}>Meldingen aanzetten</button>}
      </div>

      <p className="d-voetnoot" style={{ marginTop: 36, textAlign: 'center' }}>
        Versie van {tijdstip(GEBOUWD, vandaag)}. Staat hier een oudere tijd dan de laatste update? Sluit Daily helemaal af en open hem opnieuw.
      </p>
    </div>
  )
}
