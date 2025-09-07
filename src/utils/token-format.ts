// Central token formatting helper (no rounding, just thousands separator)
export function formatToken(value: number | string): string {
  if (value === null || value === undefined) return '0';
  const num = typeof value === 'string' ? Number(value) : value;
  if (isNaN(num)) return '0';
  return num
    .toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 8,
    })
    .replace(/\.0+$/, '');
}

export function labeledToken(label: string, value: number | string): string {
  return `${label}: ${formatToken(value)} tokens`;
}
