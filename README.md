# Sportlog

Kleine PWA om na een workout een notitie vast te leggen. De notities worden
gelezen door de ochtendbrief (`~/Projects/Daily-app`), zodat feedback van gisteren
meetelt in de training van vandaag.

**Live:** https://jensstijn-pixel.github.io/sportlog-app/

## Hoe het aan elkaar hangt

```
telefoon (PWA)  ──commit──►  sportlog-data (privé repo)  ──pull──►  Mac
     ▲                                                                │
     └──────────────── weekoverzicht, signalen, vragen ◄──────────────┘
```

- De app slaat alles op in `localStorage` en werkt volledig offline.
- Bij verbinding schrijft hij elke notitie als los JSON-bestand naar de privé
  data-repo (GitHub Contents API, fijnmazig token dat alleen op de telefoon staat).
- De Mac haalt die op vóór het bouwen van de ochtendbrief, laat een AI-stap er
  gestructureerde vlaggen van maken en schrijft weekoverzicht + antwoorden terug.

## Ontwikkelen

```bash
npm install
npm run dev      # http://localhost:5173/sportlog-app/
npm run build
```

Deploy gaat automatisch via GitHub Actions bij elke push naar `main`.

## Eerste keer instellen

Open de app → tik op de statusregel onder "Logboek" → vul een fijnmazig
GitHub-token in met `Contents: Read and write` op de repo `sportlog-data`.

Het design komt uit `design_handoff_workout_notities/` (Claude Design).
