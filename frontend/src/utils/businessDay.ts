/**
 * Business day utilities for FAMEAT POS frontend.
 *
 * A "business day" runs from 07:00:00 to 06:59:59.999 the next calendar day.
 * Sales between midnight and 7am belong to the *previous* calendar day's business day.
 */

const BUSINESS_DAY_START_HOUR = 7;

/**
 * Returns the business-day date string (YYYY-MM-DD) that the current moment belongs to.
 * If it's before 7am, it returns yesterday's date.
 */
export function getBusinessDayDate(date: Date = new Date()): string {
  const d = new Date(date);
  if (d.getHours() < BUSINESS_DAY_START_HOUR) {
    d.setDate(d.getDate() - 1);
  }
  return d.toISOString().slice(0, 10);
}

/**
 * Returns today's calendar date (YYYY-MM-DD) regardless of business day logic.
 * Used for date picker max values.
 */
export function getTodayCalendarDate(): string {
  return new Date().toISOString().slice(0, 10);
}
