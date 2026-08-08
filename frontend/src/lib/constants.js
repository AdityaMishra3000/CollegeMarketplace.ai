import {
  Laptop,
  BookOpen,
  Sofa,
  Refrigerator,
  Dumbbell,
  Package,
} from 'lucide-react'

export const CATEGORIES = [
  { value: 'electronics', label: 'Electronics', icon: Laptop },
  { value: 'textbooks', label: 'Textbooks', icon: BookOpen },
  { value: 'furniture', label: 'Furniture', icon: Sofa },
  { value: 'appliances', label: 'Appliances', icon: Refrigerator },
  { value: 'sports', label: 'Sports & Fitness', icon: Dumbbell },
  { value: 'other', label: 'Other', icon: Package },
]

export const CATEGORY_MAP = Object.fromEntries(
  CATEGORIES.map((c) => [c.value, c])
)

export const CONDITIONS = [
  { value: 'new', label: 'New' },
  { value: 'like_new', label: 'Like New' },
  { value: 'good', label: 'Good' },
  { value: 'fair', label: 'Fair' },
  { value: 'poor', label: 'Poor' },
]

export const CONDITION_MAP = Object.fromEntries(
  CONDITIONS.map((c) => [c.value, c])
)

export function conditionLabel(value) {
  return CONDITION_MAP[value]?.label || value
}

export function categoryLabel(value) {
  return CATEGORY_MAP[value]?.label || value
}
