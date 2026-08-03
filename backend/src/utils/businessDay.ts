/**
 * Business day utilities.
 * Un "día de negocio" comienza a las 07:00 y termina a las 06:59 del día siguiente.
 * Ejemplo: las 3:00am del 11 de julio pertenecen al día de negocio del 10 de julio.
 */

const BUSINESS_DAY_START_HOUR = 7;

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function fmtDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * Dado un Date, devuelve la cadena YYYY-MM-DD del "día de negocio" al que pertenece.
 */
export function getBusinessDayDate(date: Date = new Date()): string {
  const d = new Date(date);
  if (d.getHours() < BUSINESS_DAY_START_HOUR) {
    d.setDate(d.getDate() - 1);
  }
  return fmtDate(d);
}

/**
 * Para una cadena YYYY-MM-DD, devuelve un Date en 07:00:00.000 de ese día.
 */
export function getBusinessDayStart(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d, BUSINESS_DAY_START_HOUR, 0, 0, 0);
}

/**
 * Para una cadena YYYY-MM-DD, devuelve un Date en 06:59:59.999 del día SIGUIENTE.
 * (último milisegundo del día de negocio)
 */
export function getBusinessDayEnd(dateStr: string): Date {
  const start = getBusinessDayStart(dateStr);
  start.setDate(start.getDate() + 1);
  start.setHours(BUSINESS_DAY_START_HOUR - 1, 59, 59, 999);
  return start;
}

/**
 * Parsea un parámetro de fecha desde query string.
 * Si es YYYY-MM-DD se trata como día de negocio (con hora de inicio/fin).
 * Si no, se pasa directamente al constructor de Date.
 */
export function parseBusinessDateParam(value: string | undefined, isEnd: boolean): Date {
  if (!value) return new Date();
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return isEnd ? getBusinessDayEnd(value) : getBusinessDayStart(value);
  }
  return new Date(value);
}

/**
 * Agrupa una fecha en su cadena de día de negocio.
 */
export function groupByBusinessDay(date: Date): string {
  return getBusinessDayDate(date);
}
