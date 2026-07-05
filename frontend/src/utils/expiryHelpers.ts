export type ExpiryLevel = 'fresh' | 'caution' | 'warning' | 'critical' | 'expired' | 'none';

export interface ExpiryStatus {
  level: ExpiryLevel;
  daysLeft: number; // negativo = vencido hace N días
  label: string;
  /** Color clases Tailwind para badge */
  badgeBg: string;
  badgeText: string;
  badgeVariant: 'green' | 'amber' | 'orange' | 'red' | 'gray';
  /** Borde lateral para cards */
  borderClass: string;
}

const NONE: ExpiryStatus = {
  level: 'none',
  daysLeft: Infinity,
  label: 'Sin vencimiento',
  badgeBg: 'bg-gray-100 dark:bg-slate-700',
  badgeText: 'text-gray-600 dark:text-gray-300',
  badgeVariant: 'gray',
  borderClass: 'border-l-transparent',
};

export function getExpiryStatus(expiryDate?: string | Date | null): ExpiryStatus {
  if (!expiryDate) return NONE;
  const date = expiryDate instanceof Date ? expiryDate : new Date(expiryDate);
  if (isNaN(date.getTime())) return NONE;

  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const expiryDay = new Date(date);
  expiryDay.setHours(0, 0, 0, 0);
  const ms = expiryDay.getTime() - now.getTime();
  const daysLeft = Math.round(ms / (1000 * 60 * 60 * 24));

  if (daysLeft < 0) {
    return {
      level: 'expired',
      daysLeft,
      label: `Vencido hace ${Math.abs(daysLeft)} día${Math.abs(daysLeft) !== 1 ? 's' : ''}`,
      badgeBg: 'bg-red-100 dark:bg-red-900/40',
      badgeText: 'text-red-700 dark:text-red-300',
      badgeVariant: 'red',
      borderClass: 'border-l-red-600',
    };
  }
  if (daysLeft <= 1) {
    return {
      level: 'critical',
      daysLeft,
      label: daysLeft === 0 ? 'Vence hoy' : 'Vence mañana',
      badgeBg: 'bg-red-100 dark:bg-red-900/40',
      badgeText: 'text-red-700 dark:text-red-300',
      badgeVariant: 'red',
      borderClass: 'border-l-red-500',
    };
  }
  if (daysLeft <= 7) {
    return {
      level: 'warning',
      daysLeft,
      label: `Vence en ${daysLeft} días`,
      badgeBg: 'bg-orange-100 dark:bg-orange-900/40',
      badgeText: 'text-orange-700 dark:text-orange-300',
      badgeVariant: 'orange',
      borderClass: 'border-l-orange-500',
    };
  }
  if (daysLeft <= 30) {
    return {
      level: 'caution',
      daysLeft,
      label: `Vence en ${daysLeft} días`,
      badgeBg: 'bg-amber-100 dark:bg-amber-900/40',
      badgeText: 'text-amber-700 dark:text-amber-300',
      badgeVariant: 'amber',
      borderClass: 'border-l-amber-500',
    };
  }
  return {
    level: 'fresh',
    daysLeft,
    label: `Vence en ${daysLeft} días`,
    badgeBg: 'bg-green-100 dark:bg-green-900/40',
    badgeText: 'text-green-700 dark:text-green-300',
    badgeVariant: 'green',
    borderClass: 'border-l-green-500',
  };
}

export function formatExpiry(date?: string | Date | null): string {
  if (!date) return '—';
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
}
