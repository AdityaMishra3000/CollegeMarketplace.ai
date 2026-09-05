/**
 * MIRROR OF THE BACKEND TAXONOMY — do not edit in isolation.
 *
 * Source of truth: backend/src/config/taxonomy.js, also served at
 * GET /api/meta/taxonomy.
 *
 * This file exists so the UI can render categories and conditions immediately,
 * without waiting on a network round trip. It is deliberately dependency-free
 * (no imports, only literals) so backend/tests/taxonomy.contract.test.js can
 * read it and fail the build if it ever diverges from the backend.
 *
 * Icons live in ./constants.js — they are a frontend concern and are not part of
 * the shared contract.
 */

export const CATEGORIES = [
  { value: 'electronics', label: 'Electronics' },
  { value: 'textbooks', label: 'Textbooks' },
  { value: 'furniture', label: 'Furniture' },
  { value: 'appliances', label: 'Appliances' },
  { value: 'clothing', label: 'Clothing' },
  { value: 'sports', label: 'Sports & Fitness' },
  { value: 'other', label: 'Other' },
]

export const CONDITIONS = [
  { value: 'new', label: 'New', rank: 4 },
  { value: 'like_new', label: 'Like New', rank: 3 },
  { value: 'good', label: 'Good', rank: 2 },
  { value: 'fair', label: 'Fair', rank: 1 },
  { value: 'poor', label: 'Poor', rank: 0 },
]
