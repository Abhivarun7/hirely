/**
 * Format a salary range for display, currency-aware.
 *
 * INR uses lakh/thousand abbreviations (₹50K, ₹5L); other currencies
 * use the local symbol with a "k" abbreviation for thousands.
 */
export function formatSalary(
  min?: number | null,
  max?: number | null,
  currency: string = 'USD',
  disclosed: boolean = true
): string {
  if (disclosed === false) return 'Not Disclosed';
  const hasMin = typeof min === 'number' && min > 0;
  const hasMax = typeof max === 'number' && max > 0;
  if (!hasMin && !hasMax) return 'Competitive';

  const symbol = currencySymbol(currency);
  const fmt = (n: number) => abbreviate(n, currency);

  if (hasMin && hasMax) return `${symbol}${fmt(min!)} - ${symbol}${fmt(max!)}`;
  if (hasMin) return `${symbol}${fmt(min!)}+`;
  return `Up to ${symbol}${fmt(max!)}`;
}

function currencySymbol(currency: string): string {
  switch (currency.toUpperCase()) {
    case 'INR':
      return '₹';
    case 'EUR':
      return '€';
    case 'GBP':
      return '£';
    case 'USD':
    default:
      return '$';
  }
}

function abbreviate(n: number, currency: string): string {
  if (currency.toUpperCase() === 'INR') {
    if (n >= 100000) return `${trimZero(n / 100000)}L`;
    if (n >= 1000) return `${Math.round(n / 1000)}K`;
    return n.toString();
  }
  if (n >= 1000) return `${Math.round(n / 1000)}k`;
  return n.toString();
}

function trimZero(n: number): string {
  return Number.isInteger(n) ? n.toString() : n.toFixed(1);
}
