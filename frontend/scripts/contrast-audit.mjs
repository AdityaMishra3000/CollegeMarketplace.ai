/**
 * Contrast audit for the design tokens in src/index.css.
 *
 * Parses the real :root and .dark blocks, converts OKLCH → sRGB, and checks
 * every pair the UI actually renders. Run after any token change:
 *
 *   node scripts/contrast-audit.mjs
 */
import fs from 'node:fs'

const CSS = new URL('../src/index.css', import.meta.url)

function oklchToRgb(L, C, Hdeg) {
  const h = (Hdeg * Math.PI) / 180
  const a = C * Math.cos(h)
  const b = C * Math.sin(h)
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b
  const s_ = L - 0.0894841775 * a - 1.291485548 * b
  const l = l_ ** 3
  const m = m_ ** 3
  const s = s_ ** 3
  const lin = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ]
  return lin.map((v) => {
    const s2 = v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055
    return Math.max(0, Math.min(255, Math.round(s2 * 255)))
  })
}

const luminance = ([r, g, b]) => {
  const f = (c) => {
    c /= 255
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
}

const ratio = (a, b) => {
  const [x, y] = [luminance(a), luminance(b)]
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)
}

function parseBlock(css, selector) {
  const start = css.indexOf(selector)
  const open = css.indexOf('{', start)
  const end = css.indexOf('\n}', open)
  const body = css.slice(open, end)
  const tokens = {}
  for (const m of body.matchAll(/--([a-z-]+):\s*oklch\(([\d.]+)\s+([\d.]+)\s+([\d.]+)\)/g)) {
    tokens[m[1]] = oklchToRgb(Number(m[2]), Number(m[3]), Number(m[4]))
  }
  return tokens
}

const css = fs.readFileSync(CSS, 'utf8')
const themes = { light: parseBlock(css, ':root {'), dark: parseBlock(css, '.dark {') }

/* [foreground, background, label, minimum] — 4.5 normal text, 3.0 large/UI. */
const PAIRS = [
  ['foreground', 'background', 'body text on page', 4.5],
  ['foreground', 'card', 'body text on card', 4.5],
  ['muted-foreground', 'background', 'muted text on page', 4.5],
  ['muted-foreground', 'card', 'muted text on card', 4.5],
  ['muted-foreground', 'muted', 'muted text on muted surface', 4.5],
  ['secondary-foreground', 'secondary', 'secondary badge', 4.5],
  ['primary-foreground', 'primary', 'BUTTON LABEL on orange fill', 4.5],
  ['primary-ink', 'background', 'orange text on page', 4.5],
  ['primary-ink', 'card', 'orange text on card', 4.5],
  ['primary-ink', 'primary-subtle', 'orange text on orange wash', 4.5],
  ['accent-foreground', 'accent', 'accent text on accent surface', 4.5],
  ['destructive-foreground', 'destructive', 'danger button label', 4.5],
  ['destructive', 'background', 'danger text on page', 4.5],
  ['success', 'background', 'success text on page', 4.5],
  ['warning', 'background', 'warning text on page', 4.5],
  ['info', 'background', 'info text on page', 4.5],
  // Non-text contrast (WCAG 1.4.11): only boundaries that *identify a control*
  // need 3:1. Form-field borders and the focus ring do; decorative dividers
  // (--border, --border-strong) do not, and are excluded on purpose.
  //
  // The orange fill itself is 2.52:1 against white and cannot be changed —
  // #FF8000 is the canonical brand colour — so the primary button carries a
  // --primary-active border to give it a compliant boundary instead.
  ['input', 'background', 'form-field border vs page (UI)', 3.0],
  ['ring', 'background', 'focus ring vs page (UI)', 3.0],
  ['primary-active', 'background', 'primary button edge vs page (UI)', 3.0],
]

let failures = 0
for (const [name, tokens] of Object.entries(themes)) {
  console.log(`\n  ${name.toUpperCase()}`)
  for (const [fg, bg, label, min] of PAIRS) {
    if (!tokens[fg] || !tokens[bg]) {
      console.log(`    ??   ${label} — token missing (${fg} / ${bg})`)
      failures += 1
      continue
    }
    const r = ratio(tokens[fg], tokens[bg])
    const ok = r >= min
    if (!ok) failures += 1
    console.log(
      `    ${ok ? 'ok  ' : 'FAIL'} ${r.toFixed(2).padStart(5)}:1  (min ${min})  ${label}`
    )
  }
}

console.log(
  `\n  ${failures === 0 ? 'All token pairs meet their target.' : `${failures} pair(s) below target.`}\n`
)
process.exit(failures === 0 ? 0 : 1)
