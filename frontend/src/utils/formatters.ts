export function formatCurrency(amount: number | string): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

export function formatWeight(kg: number | string): string {
  const num = typeof kg === 'string' ? parseFloat(kg) : kg;
  return `${num.toFixed(3)} kg`;
}

/** Muestra numero sin decimales innecesarios: 24 → "24", 1.5 → "1.5", 0.250 → "0.25" */
export function formatQty(value: number | string): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (Number.isInteger(num)) return num.toString();
  // Hasta 3 decimales, sin ceros finales
  return parseFloat(num.toFixed(3)).toString();
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatDateTime(date: string | Date): string {
  return new Date(date).toLocaleString('es-CO', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
