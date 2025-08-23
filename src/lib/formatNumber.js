export function formatCurrencyCompact(n) {
  if (n == null || Number.isNaN(n)) return '$0';
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'AUD',
    notation: 'compact',
    maximumFractionDigits: 2,
  }).format(Number(n));
}

export function formatYears(n) {
  return `${Math.round(Number(n))} ${Math.round(Number(n)) === 1 ? 'year' : 'years'}`;
}