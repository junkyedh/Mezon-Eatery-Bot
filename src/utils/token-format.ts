export function formatToken(value: number | string): string {
  if (value === null || value === undefined) return '0đ';
  const num = typeof value === 'string' ? Number(value) : value;
  if (isNaN(num)) return '0đ';

  // Format with dots as thousands separator like Mezon SDK
  const formatted = Math.floor(num)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.');

  return `${formatted}đ`;
}

export function labeledToken(label: string, value: number | string): string {
  return `${label}: ${formatToken(value)}`;
}
