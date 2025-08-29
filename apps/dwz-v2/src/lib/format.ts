export const auCurrency = new Intl.NumberFormat('en-AU', {
  style: 'currency',
  currency: 'AUD',
  maximumFractionDigits: 0
});

export function auMoney0(n: number | null | undefined): string {
  const v = Number.isFinite(Number(n)) ? Number(n) : 0;
  return auCurrency.format(v);
}

export function tickShortAUD(n: number): string {
  const v = Math.abs(n);
  if (v >= 1_000_000_000) return `${Math.round(n/1_000_000_000)}b`;
  if (v >= 1_000_000)     return `${Math.round(n/1_000_000)}m`;
  if (v >= 1_000)         return `${Math.round(n/1_000)}k`;
  return `${Math.round(n)}`;
}

export function tooltipAUD(n: any): string {
  const v = typeof n === 'number' ? n : Number(n ?? 0);
  return auCurrency.format(v);
}