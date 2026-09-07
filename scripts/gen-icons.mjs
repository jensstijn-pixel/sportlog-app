#!/usr/bin/env node
/**
 * App-iconen tekenen uit public/favicon.svg.
 *
 * Waarom via headless Chrome: op deze Mac staat geen ImageMagick, en `sips`
 * kan geen SVG lezen. Chrome staat er wel, rendert de afgeronde hoeken netjes
 * en geeft echte anti-aliasing. Zie ook Norvin-site/HISTORY.md, waar dezelfde
 * beperking voor WebP naar voren kwam.
 *
 * Gebruik:  node scripts/gen-icons.mjs
 */

import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, writeFileSync, rmSync, renameSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const WORTEL = join(dirname(fileURLToPath(import.meta.url)), '..')
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

/** Wat we maken.
 *
 *  `vierkant: true` haalt de eigen afronding weg. Dat is nodig waar het
 *  systeem zelf een masker oplegt: iOS rondt het beginscherm-icoon af, en
 *  Android snijdt een maskable icoon in een cirkel of afgeronde vierkant. Laat
 *  je je eigen afronding staan, dan krijg je een dubbele rand met doorzichtige
 *  hoekjes ertussen. */
const MATEN = [
  { bestand: 'icon-512.png', px: 512 },
  { bestand: 'icon-192.png', px: 192 },
  { bestand: 'apple-touch-icon.png', px: 180, vierkant: true },
  { bestand: 'icon-512-maskable.png', px: 512, vierkant: true },
]

const svgBron = readFileSync(join(WORTEL, 'public', 'favicon.svg'), 'utf8')
const werkmap = mkdtempSync(join(tmpdir(), 'sportlog-icons-'))

try {
  for (const { bestand, px, vierkant } of MATEN) {
    const svg = vierkant ? svgBron.replace(' rx="112"', '') : svgBron
    // De SVG in een pagina zonder marges, precies zo groot als het icoon.
    const html = `<!doctype html><meta charset="utf-8">
<style>html,body{margin:0;padding:0;background:transparent}
svg{display:block;width:${px}px;height:${px}px}</style>${svg}`
    const htmlPad = join(werkmap, `${px}.html`)
    writeFileSync(htmlPad, html, 'utf8')

    execFileSync(
      CHROME,
      [
        '--headless',
        '--disable-gpu',
        '--hide-scrollbars',
        '--default-background-color=00000000',
        `--screenshot=${join(werkmap, bestand)}`,
        `--window-size=${px},${px}`,
        `file://${htmlPad}`,
      ],
      { stdio: 'pipe' },
    )

    renameSync(join(werkmap, bestand), join(WORTEL, 'public', bestand))
    console.log(`${bestand} (${px}×${px})`)
  }
  console.log('Klaar. Vergeet niet te bouwen en te deployen.')
} finally {
  rmSync(werkmap, { recursive: true, force: true })
}
