import { CATEGORIES, CONDITIONS } from './taxonomy'
import { getTaxonomy } from '../api/ai'

/**
 * Development-only drift detector.
 *
 * lib/taxonomy.js is a local mirror of the backend's canonical taxonomy, kept so
 * the UI can render without waiting on a request. A backend test already fails if
 * the two files diverge in the repository — this catches the other case: running
 * this frontend against a backend whose taxonomy has moved on.
 *
 * It only reports; it never changes behaviour, and it is stripped from production
 * builds by the `import.meta.env.DEV` guard at the call site.
 */
export async function verifyTaxonomy() {
  try {
    const remote = await getTaxonomy()

    const compare = (label, local, incoming) => {
      const a = local.map((item) => `${item.value}:${item.label}`)
      const b = (incoming ?? []).map((item) => `${item.value}:${item.label}`)
      if (a.join('|') === b.join('|')) return true

      console.error(
        `[taxonomy] ${label} drift between frontend and backend.\n` +
          `  frontend: ${a.join(', ') || '(none)'}\n` +
          `  backend : ${b.join(', ') || '(none)'}\n` +
          '  Fix: copy backend/src/config/taxonomy.js into frontend/src/lib/taxonomy.js.'
      )
      return false
    }

    const ok =
      compare('categories', CATEGORIES, remote?.categories) &&
      compare('conditions', CONDITIONS, remote?.conditions)

    if (ok) console.info('[taxonomy] frontend mirror matches the backend')
  } catch {
    // The backend being unreachable is a separate, already-visible problem.
  }
}
