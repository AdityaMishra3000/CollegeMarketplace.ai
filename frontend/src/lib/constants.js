import {
  Laptop,
  BookOpen,
  Sofa,
  Refrigerator,
  Shirt,
  Dumbbell,
  Package,
} from 'lucide-react'
import { CATEGORIES as TAXONOMY_CATEGORIES, CONDITIONS as TAXONOMY_CONDITIONS } from './taxonomy'

/**
 * Category/condition lists for the UI.
 *
 * Values and labels come from ./taxonomy.js, which mirrors the backend's
 * canonical taxonomy. Only the icons are declared here. Previously this file
 * declared its own list, which is how the frontend ended up offering
 * `appliances` (unknown to the ML service), omitting `clothing` (70 seeded
 * listings the UI could not filter) and sending `like_new` where the rest of the
 * system said `like-new`.
 */

const CATEGORY_ICONS = {
  electronics: Laptop,
  textbooks: BookOpen,
  furniture: Sofa,
  appliances: Refrigerator,
  clothing: Shirt,
  sports: Dumbbell,
  other: Package,
}

export const CATEGORIES = TAXONOMY_CATEGORIES.map((category) => ({
  ...category,
  icon: CATEGORY_ICONS[category.value] || Package,
}))

export const CONDITIONS = TAXONOMY_CONDITIONS

export const CATEGORY_MAP = Object.fromEntries(CATEGORIES.map((c) => [c.value, c]))
export const CONDITION_MAP = Object.fromEntries(CONDITIONS.map((c) => [c.value, c]))

/**
 * Legacy values that may still exist on older documents, so an un-migrated
 * listing renders as "Like New" rather than the raw string `like-new`.
 */
const LEGACY_CONDITIONS = { 'like-new': 'like_new' }

export function conditionLabel(value) {
  const canonical = LEGACY_CONDITIONS[value] || value
  return CONDITION_MAP[canonical]?.label || value
}

export function categoryLabel(value) {
  return CATEGORY_MAP[value]?.label || value
}

export function categoryIcon(value) {
  return CATEGORY_MAP[value]?.icon || Package
}
