/**
 * Business day utilities for FAMEAT POS.
 *
 * A "business day" runs from 07:00:00 to 06:59:59.999 the next calendar day.
 * Sales between midnight and 7am belong to the *previous* calendar day's business day.
 *
 * Example:
 *   - 2026-07-11 06:59 → business day 2026-07-10
 *   - 2026-07-11 07:00 → business day 2026-07-11
 *   - 2026-07-11 22:00 → business day 2026-07-11
 *   - 2026-07-12 03:00 → business day 2026-07-11
 */

const BUSINESS_DAY_START_HOUR = 7;

/**
 * Returns the business-day date string (YYYY-MM-DD) that a given timestamp belongs to.
 * If the timestamp is before 7am local, it belongs to the previous calendar day.
 */
export function getBusinessDayDate(date: Date = new Date()): string {
  const d = new Date(date);
  if (d.getHours() < BUSINESS_DAY_START_HOUR) {
    d.setDate(d.getDate() - 1);
  }
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Returns the start of a business day (07:00:00.000) for a given YYYY-MM-DD string.
 */
export function getBusinessDayStart(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d, BUSINESS_DAY_START_HOUR, 0, 0, 0);
}

/**
 * Returns the end of a business day (06:59:59.999 of the next calendar day)
 * for a given YYYY-MM-DD string.
 */
export function getBusinessDayEnd(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d + 1, BUSINESS_DAY_START_HOUR - 1, 59, 59, 999);
}

/**
 * Parses a date param string (YYYY-MM-DD) into business-day-aware start/end bounds.
 * Used to replace the old parseDateParam in controllers.
 *
 * For "from" date: returns the start of that business day (07:00:00).
 * For "to" date: returns the end of that business day (06:59:59.999 next day).
 */
export function parseBusinessDateParam(value: string, isEndDate: boolean): Date {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return isEndDate ? getBusinessDayEnd(value) : getBusinessDayStart(value);
  }
  return new Date(value);
}

/**
 * Groups a Date into its business day date string (YYYY-MM-DD).
 * Used for daily series grouping in reports and dashboards.
 */
export function groupByBusinessDay(date: Date): string {
  return getBusinessDayDate(date);
}
