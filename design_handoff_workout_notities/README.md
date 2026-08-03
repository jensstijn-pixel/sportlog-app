# Handoff: Workout Notities (iPhone app)

## Overview
Een mobiele iPhone-app waarin de gebruiker na een workout een vrije-tekst notitie schrijft, met datum, workout-type label, duur en energiescore (1–5). Notities zijn later terug te lezen via een kalenderweergave en worden door een AI uitgelezen voor wekelijkse samenvattingen/voortgang. Taal van de UI: **Nederlands**.

## About the Design Files
De bestanden in dit pakket zijn **design-referenties gemaakt in HTML** — prototypes die de bedoelde look & feel tonen, géén productiecode om direct over te nemen. De taak is deze designs te **herbouwen in de doel-codebase** (SwiftUI, React Native, Flutter, …) met de daar gebruikelijke patronen en libraries. Bestaat er nog geen codebase, kies dan het meest passende framework voor een iOS-app (SwiftUI ligt voor de hand) en implementeer de designs daar.

- `Workout Notities.dc.html` — alle vier de schermen (het `<x-dc>`-template bevat de volledige markup met inline styles; exacte waarden staan daar)
- `ios-frame.jsx` — alleen het iPhone-kader/statusbalk rond de schermen; **niet implementeren**, dit levert iOS zelf

## Fidelity
**High-fidelity.** Kleuren, typografie, spacing en copy zijn definitief bedoeld. Pixel-perfect herbouwen met de bestaande componenten van het platform.

## Screens / Views

### 1a — Nieuwe notitie (editor)
- **Purpose**: notitie schrijven direct na een workout; datum staat automatisch ingevuld.
- **Layout**: fullscreen donker (`#0B0C0E`), padding 20px horizontaal. Verticale stapel: topbar → datum+titel → type-chips → duur/energie-rij → tekstveld (vult resterende ruimte) → iOS-toetsenbord.
- **Componenten**:
  - Topbar: links "Annuleer" (15px, 50% wit), rechts "Opslaan" (15px, bold 700, accent `#C8F542`).
  - Datum-eyebrow: monospace (ui-monospace/Menlo), 12px, uppercase, letter-spacing 0.12em, accentkleur. Formaat: "MA 3 AUG 2026".
  - Titel "Nieuwe notitie": 30px, weight 800, letter-spacing −0.02em.
  - Type-chips (flex, gap 8px): geselecteerd = pill met accent-achtergrond en donkere tekst (`#0B0C0E`), 13px/700, padding 8×14, radius 999; niet-geselecteerd = transparant, border 1px `rgba(255,255,255,0.14)`, tekst 60% wit, 13px/600. Opties: Krachttraining, Hardlopen, Anders.
  - Duur & Energie kaarten (flex-rij, gap 10px, elk flex:1): achtergrond `#15171B`, border 1px `rgba(255,255,255,0.07)`, radius 14, padding 10×14. Label 11px uppercase 45% wit; waarde 17px/700. Energie = 5 dots van 12px (gap 5px): gevuld accent, leeg `rgba(255,255,255,0.14)`.
  - Tekstveld: kaartstijl (zelfde bg/border), radius 16, padding 14×16, tekst 16px, line-height 1.55, kleur `#E9EAE5`. Caret: 2px accentkleur, knipperend (1.1s).

### 1b — Logboek (kalenderweergave)
- **Purpose**: oude notities terugvinden per datum.
- **Layout**: header (titel + maandnavigatie) → weekdagkoppen → maandgrid 7 kolommen → dagpreview-kaart → zwevende CTA onderaan.
- **Componenten**:
  - Titel "Logboek" 32px/800; maand-eyebrow monospace 12px uppercase 50% wit ("AUGUSTUS 2026").
  - Maandnavigatie: twee ronde 34px knoppen (‹ ›), border 1px `rgba(255,255,255,0.14)`.
  - Weekdagkoppen MA–ZO: monospace 10px, letter-spacing 0.1em, 40% wit. Week start op **maandag**.
  - Dagcellen: 15px, 85% wit; buiten de maand 25% wit; onder elke dag met workout een 4px accent-dot (dagen buiten de maand: dot op 35% opacity).
  - Vandaag: 32px accentkleurige cirkel, dagcijfer donker en weight 800.
  - Dagpreview-kaart: sectielabel "VANDAAG · MA 3 AUG" (12px uppercase 45% wit), kaart `#15171B`/border 7% wit/radius 16 met type-badge (pill, bg `rgba(200,245,66,0.14)`, tekst accent, 12px/700), meta "52 min · energie 4/5" (12px 50% wit) en 2-regelige tekstpreview met ellipsis (14px, lh 1.5, 75% wit). Tik → scherm 1c.
  - CTA "＋ Nieuwe notitie": zwevende pill onderaan gecentreerd, accent-bg, donkere tekst 15px/800, padding 14×24, glow-schaduw `0 8px 30px rgba(200,245,66,0.25)`. Tik → scherm 1a.

### 1c — Notitie teruglezen (detail)
- **Purpose**: één opgeslagen notitie volledig lezen.
- **Layout**: topbar ("‹ Logboek" links, "Bewerk" rechts in accent/700) → datum-eyebrow + titel (30px/800, hier de zelfgekozen titel, bv. "Benen + core") → meta-rij → notitiekaart → AI-kaart.
- Meta-rij: type-badge (zelfde stijl als 1b) + "65 min · energie 3/5" (13px, 50% wit).
- Notitiekaart: `#15171B`, radius 16, padding 18, tekst 16px lh 1.65 `#E9EAE5`, alinea's met witregel.
- AI-kaart: gradient `linear-gradient(135deg,#15171B,#1A1E15)`, border 1px `rgba(200,245,66,0.2)`, radius 16. Kop "✦ AI LEEST MEE" (12px uppercase accent 700), body 13.5px lh 1.5 65% wit.

### 1d — AI weekoverzicht (Inzicht)
- **Purpose**: wekelijkse AI-samenvatting en voortgang.
- **Layout**: titel "Inzicht ✦" (32px/800, ster in accent 22px) + week-eyebrow ("WEEK 31 · 27 JUL – 2 AUG") → 3 stat-kaarten → weekgrafiek → samenvattingskaart → vraag-input onderaan.
- Stat-kaarten (flex, gap 10, elk flex:1, kaartstijl radius 14, padding 12×14): groot getal 24px/800 (eerste in accent), label 11px uppercase 45% wit. Voorbeeld: 4 Workouts / 3u 40 Totaal / 3,8 Energie ø.
- Weekgrafiek: kaart met 7 kolommen (gap 12, hoogte 90px), bar radius 6; dagen mét workout accent-bar (hoogte ∝ duur), zonder workout 6px track `rgba(255,255,255,0.08)`; daglabels monospace 10px 40% wit.
- Samenvattingskaart: zelfde AI-gradient/border als 1c; kop "✦ SAMENVATTING", body 14.5px lh 1.6 80% wit. Inhoud komt uit het AI-model op basis van de weeknotities.
- Vraag-input: pill onderaan (margin-top auto), `#15171B`, border 1px 10% wit, padding 13×18; placeholder "Vraag iets over je training…" 14px 40% wit; verzendknop 30px accent-cirkel met ↑.

## Interactions & Behavior
- Flow: Logboek (1b) is home. "＋ Nieuwe notitie" → editor (1a). "Opslaan" → notitie persistent opslaan → terug naar 1b. Dag met dot aantikken → detail (1c). "Bewerk" → 1a met bestaande waarden.
- Editor: datum automatisch vandaag (niet bewerkbaar in v1); precies één type-chip actief; energie via tikken op dots; duur numeriek invoerveld (minuten).
- Kalender: ‹ › wisselt maand; vandaag altijd gemarkeerd; dot = ≥1 notitie op die dag.
- AI: notities moeten als gestructureerde data opgeslagen worden zodat een AI ze kan uitlezen — per notitie: `{ id, datum (ISO 8601), type, duurMinuten, energie (1–5), titel?, tekst }`. Weekoverzicht (1d) wordt gegenereerd uit alle notities van de betreffende week; de vraag-input stuurt een vrije vraag + notitiecontext naar het model.
- Animaties: minimaal; caret-knipperen in editor; standaard iOS push/modal-transities volstaan.

## State Management
- `notes: Note[]` — persistent (lokale opslag of backend).
- `selectedDate`, `visibleMonth` (kalender), `draft` (editor: type, duur, energie, tekst).
- `weeklySummary` — gecachte AI-output per weeknummer; herbereken bij nieuwe/gewijzigde notities.

## Design Tokens
- **Kleuren**: achtergrond `#0B0C0E`; kaart `#15171B`; kaart-border `rgba(255,255,255,0.07)` (inputs 0.10, chips/knoppen 0.14); tekst primair `#F3F4F1`; notitietekst `#E9EAE5`; muted = wit op 85/75/65/60/50/45/40/25%; accent (volt) `#C8F542`; accent-tint bg `rgba(200,245,66,0.14)`; AI-gradient `linear-gradient(135deg,#15171B,#1A1E15)` met border `rgba(200,245,66,0.2)`; tekst op accent altijd `#0B0C0E`.
- **Typografie**: Archivo (Google Fonts; op iOS mag SF Pro als systeemvervanger, maar Archivo heeft de voorkeur) — 400/500/600/700/800. Eyebrows/daglabels: ui-monospace/Menlo. Schaal: 32/30 (titels, 800, ls −0.02em), 24 (stats, 800), 17 (waarde, 700), 16 (body, lh 1.55–1.65), 15, 14.5, 14, 13.5, 13, 12 (eyebrow, uppercase, ls 0.12em), 11 (kaartlabel, uppercase), 10 (mono-microlabels).
- **Spacing**: schermpadding 20px horizontaal; kaart-padding 12–18px; rij-gaps 8/10/12px; sectie-marges 12–18px.
- **Radius**: chips/pills 999; kaarten 14–16; grafiekbars 6.
- **Schaduw**: alleen CTA-glow `0 8px 30px rgba(200,245,66,0.25)`.
- **Minimum hit target**: 44×44px voor alle interactieve elementen.

## Assets
Geen afbeeldingen of icon-assets. "✦", "＋", "‹›", "↑" zijn tekstglyphs — vervang in productie door SF Symbols (bv. `sparkles`, `plus`, `chevron.left/right`, `arrow.up`). Statusbalk/toetsenbord in de mocks komen uit het device-frame en horen niet bij de app.

## Files
- `Workout Notities.dc.html` — vier schermen (1a editor, 1b kalender, 1c detail, 1d AI-inzicht); markup met exacte inline styles in `<x-dc>`.
- `ios-frame.jsx` — iPhone-frame rond de mocks, alleen ter referentie.
