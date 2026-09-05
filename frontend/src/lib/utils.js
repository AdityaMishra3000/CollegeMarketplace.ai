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

/**
 * One price formatter for the whole app.
 *
 * Prices were rendered three different ways: `toFixed(2)` on the marketplace
 * card ("₹45000.00"), `toLocaleString()` on the product page ("₹45,000"), and
 * with a dollar sign on the dashboard ("$45000.00") for what are rupee amounts.
 */
export function formatPrice(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "₹—";
  return `₹${priceFormatter.format(amount)}`;
}
