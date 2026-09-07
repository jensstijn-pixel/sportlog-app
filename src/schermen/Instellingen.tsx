import { useState } from 'react'
import { controleer, herstelPostenVanRepo, herstelTakenVanRepo, herstelVanRepo } from '../lib/github'
import { meldingStand, testMelding, zetMeldingenAan } from '../lib/melding'
import { opslag } from '../lib/opslag'
import { Eyebrow, Titel } from '../onderdelen/ui'

export default function Instellingen({
  aantalNotities,
  wachtend,
  onTerug,
  onGewijzigd,
}: {
  aantalNotities: number
  wachtend: number
  onTerug: () => void
  onGewijzigd: () => void
}) {
  const huidig = opslag.instellingen()
  const [token, setToken] = useState(huidig.token)
  const [owner, setOwner] = useState(huidig.owner)
  const [repo, setRepo] = useState(huidig.repo)
  const [melding, setMelding] = useState<{ tekst: string; goed: boolean } | null>(null)
  const [bezig, setBezig] = useState(false)

  async function bewaarEnTest() {
    setBezig(true)
    setMelding(null)
    const inst = { token: token.trim(), owner: owner.trim(), repo: repo.trim() }
    opslag.zetInstellingen(inst)
    const uitkomst = await controleer(inst)
    setMelding(
      uitkomst.ok
        ? { tekst: 'Gekoppeld. Notities worden voortaan automatisch doorgestuurd.', goed: true }
        : { tekst: uitkomst.fout, goed: false },
    )
    setBezig(false)
    onGewijzigd()
  }

  /** Alles terughalen wat in de repo staat maar nog niet op dit toestel.
   *
   *  Haalde eerder alleen notities op. Dat was een gat: taken en geldposten
   *  kunnen ook buiten de app om in de repo komen (de Mac schrijft ze), en dan
   *  bleef de app leeg zonder dat iets dat verklaarde. */
  const [stand, setStand] = useState(meldingStand)

  async function meldingenAan() {
    setBezig(true)
    setMelding(null)
    const uitkomst = await zetMeldingenAan()
    setMelding({ tekst: uitkomst.tekst, goed: uitkomst.ok })
    setStand(meldingStand())
    setBezig(false)
  }

  async function herstel() {
    setBezig(true)
    setMelding(null)
    try {
      const [notities, taken, posten] = await Promise.all([
        herstelVanRepo(),
        herstelTakenVanRepo(),
        herstelPostenVanRepo(),
      ])
      const delen = [
        notities ? `${notities} notitie${notities === 1 ? '' : 's'}` : null,
        taken ? `${taken} ta${taken === 1 ? 'ak' : 'ken'}` : null,
        posten ? `${posten} geldpost${posten === 1 ? '' : 'en'}` : null,
      ].filter(Boolean)
      setMelding({
        tekst: delen.length
          ? `${delen.join(', ')} teruggehaald.`
          : 'Niets nieuws gevonden — je bent bij.',
        goed: true,
      })
      onGewijzigd()
    } catch (e) {
      setMelding({ tekst: e instanceof Error ? e.message : 'Ophalen mislukt.', goed: false })
    } finally {
      setBezig(false)
    }
  }

  return (
    <div className="min-h-dvh px-5 pt-[calc(env(safe-area-inset-top)+12px)] pb-10">
      <button type="button" onClick={onTerug} className="py-2 text-[15px] text-tekst/50">
        ‹ Logboek
      </button>

      <div className="mt-4">
        <Titel>Koppeling</Titel>
        <div className="mt-1">
          <Eyebrow>
            {aantalNotities} notities · {wachtend} wachtend
          </Eyebrow>
        </div>
      </div>

      <div className="kaart mt-5 rounded-[16px] p-4">
        <label className="block text-[11px] uppercase tracking-[0.08em] text-tekst/45">
          GitHub-token
        </label>
        <input
          value={token}
          onChange={(e) => setToken(e.target.value)}
          type="password"
          autoComplete="off"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          placeholder="github_pat_…"
          className="mt-1.5 w-full text-[15px]"
        />
      </div>

      <div className="mt-2.5 flex gap-2.5">
        <div className="kaart flex-1 rounded-[14px] px-3.5 py-2.5">
          <label className="block text-[11px] uppercase tracking-[0.08em] text-tekst/45">Eigenaar</label>
          <input value={owner} onChange={(e) => setOwner(e.target.value)} className="mt-0.5 w-full text-[15px]" />
        </div>
        <div className="kaart flex-1 rounded-[14px] px-3.5 py-2.5">
          <label className="block text-[11px] uppercase tracking-[0.08em] text-tekst/45">Repo</label>
          <input value={repo} onChange={(e) => setRepo(e.target.value)} className="mt-0.5 w-full text-[15px]" />
        </div>
      </div>

      {melding && (
        <p className={`mt-3 text-[13px] leading-[1.5] ${melding.goed ? 'text-accent' : 'text-tekst/70'}`}>
          {melding.tekst}
        </p>
      )}

      <button
        type="button"
        onClick={bewaarEnTest}
        disabled={bezig}
        className="mt-4 w-full rounded-full bg-accent py-3.5 text-[15px] font-extrabold text-bg disabled:opacity-40"
      >
        {bezig ? 'Even geduld…' : 'Bewaren en testen'}
      </button>

      <button
        type="button"
        onClick={herstel}
        disabled={bezig || !token}
        className="mt-2.5 w-full rounded-full border border-white/14 py-3.5 text-[14px] font-semibold text-tekst/70 disabled:opacity-40"
      >
        Alles terughalen uit de repo
      </button>

      <div className="kaart mt-6 rounded-[16px] p-4">
        <div className="mb-2 text-[11px] uppercase tracking-[0.08em] text-mut">Ochtendmelding</div>
        {stand === 'aan' ? (
          <>
            <p className="text-[13px] leading-[1.6] text-body">
              Staat aan. Je krijgt 's ochtends één melding zodra de Mac je brief heeft
              gemaakt: wat er nog ingevuld moet worden, of je training van vandaag.
            </p>
            <button
              type="button"
              onClick={() => void testMelding()}
              className="mt-3 w-full rounded-full border border-white/14 py-3 text-[14px] font-semibold text-tekst/70"
            >
              Testmelding tonen
            </button>
          </>
        ) : stand === 'geweigerd' ? (
          <p className="text-[13px] leading-[1.6] text-body">
            Meldingen zijn geweigerd voor deze app. Terugzetten kan alleen via Instellingen →
            Meldingen → Sportlog op je telefoon.
          </p>
        ) : stand === 'kan-niet' ? (
          <p className="text-[13px] leading-[1.6] text-body">
            Dit toestel kan geen meldingen tonen. Op de iPhone werkt het alleen als de app via
            Deel → Zet op beginscherm is geïnstalleerd.
          </p>
        ) : (
          <>
            <p className="text-[13px] leading-[1.6] text-body">
              Eén melding per ochtend, rond de tijd dat je brief klaar is: welke cijfers je nog
              moet invullen, of wat je vandaag traint. Je telefoon vraagt daarna zelf om
              toestemming — die vraag krijg je maar één keer, dus tik op toestaan.
            </p>
            <button
              type="button"
              onClick={meldingenAan}
              disabled={bezig}
              className="mt-3 w-full rounded-full bg-accent py-3 text-[14px] font-bold text-inkt disabled:opacity-40"
            >
              Meldingen aanzetten
            </button>
          </>
        )}
      </div>

      <div className="kaart mt-6 rounded-[16px] p-4 text-[13px] leading-[1.6] text-tekst/60">
        <div className="mb-2 text-[11px] uppercase tracking-[0.08em] text-tekst/45">Token maken</div>
        <ol className="list-inside list-decimal space-y-1">
          <li>
            Ga naar{' '}
            <span className="text-accent">github.com → Settings → Developer settings</span> →
            Personal access tokens → <span className="text-accent">Fine-grained tokens</span>.
          </li>
          <li>“Generate new token”, alleen de repo <span className="text-accent">{repo}</span> selecteren.</li>
          <li>
            Onder Permissions → Repository permissions: <span className="text-accent">Contents</span> op{' '}
            <span className="text-accent">Read and write</span>. Meer heeft hij niet nodig.
          </li>
          <li>Token kopiëren en hierboven plakken.</li>
        </ol>
        <p className="mt-3 text-tekst/45">
          Het token blijft op deze telefoon staan en gaat nergens anders heen. Verlies je 'm, dan maak
          je gewoon een nieuwe — je notities blijven in de repo staan.
        </p>
      </div>
    </div>
  )
}
