import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function initials(name = "") {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
}

const priceFormatter = new Intl.NumberFormat("en-IN", {
  maximumFractionDigits: 0,
});

export const CURRENCY = "₹";

/**
 * One price formatter for the whole app.
 *
 * Prices were rendered three different ways: `toFixed(2)` on the marketplace
 * card ("₹45000.00"), `toLocaleString()` on the product page ("₹45,000"), and
 * with a dollar sign on the dashboard ("$45000.00") for what are rupee amounts.
 *
 * `formatAmount` returns the digits only, because the display face has no rupee
 * glyph and the <Price> component sets the symbol separately. See Editorial.jsx.
 */
export function formatAmount(value) {
  const amount = Number(value);
  return Number.isFinite(amount) ? priceFormatter.format(amount) : "—";
}

export function formatPrice(value) {
  return `${CURRENCY}${formatAmount(value)}`;
}
