import { describe, it, expect } from 'vitest';
import {
  getBusinessDayDate,
  getBusinessDayStart,
  getBusinessDayEnd,
  parseBusinessDateParam,
  groupByBusinessDay,
} from '../businessDay';

describe('getBusinessDayDate', () => {
  it('maps 3:30am to previous day', () => {
    const date = new Date(2026, 6, 11, 3, 30, 0);
    expect(getBusinessDayDate(date)).toBe('2026-07-10');
  });

  it('maps 6:59:59am to previous day', () => {
    const date = new Date(2026, 6, 11, 6, 59, 59);
    expect(getBusinessDayDate(date)).toBe('2026-07-10');
  });

  it('maps 7:00am to same day', () => {
    const date = new Date(2026, 6, 11, 7, 0, 0);
    expect(getBusinessDayDate(date)).toBe('2026-07-11');
  });

  it('maps afternoon to same day', () => {
    const date = new Date(2026, 6, 11, 15, 0, 0);
    expect(getBusinessDayDate(date)).toBe('2026-07-11');
  });

  it('maps 11:59pm to same day', () => {
    const date = new Date(2026, 6, 11, 23, 59, 0);
    expect(getBusinessDayDate(date)).toBe('2026-07-11');
  });

  it('maps midnight to previous day', () => {
    const date = new Date(2026, 6, 12, 0, 0, 0);
    expect(getBusinessDayDate(date)).toBe('2026-07-11');
  });

  it('maps 1am to previous day', () => {
    const date = new Date(2026, 6, 12, 1, 0, 0);
    expect(getBusinessDayDate(date)).toBe('2026-07-11');
  });

  it('handles midnight at year boundary', () => {
    const date = new Date(2027, 0, 1, 0, 0, 0);
    expect(getBusinessDayDate(date)).toBe('2026-12-31');
  });

  it('handles 6:59am on first day of month', () => {
    const date = new Date(2026, 6, 1, 6, 59, 0);
    expect(getBusinessDayDate(date)).toBe('2026-06-30');
  });
});

describe('getBusinessDayStart', () => {
  it('returns 07:00:00 for a given date', () => {
    const start = getBusinessDayStart('2026-07-10');
    expect(start.getHours()).toBe(7);
    expect(start.getMinutes()).toBe(0);
    expect(start.getSeconds()).toBe(0);
    expect(start.getDate()).toBe(10);
  });
});

describe('getBusinessDayEnd', () => {
  it('returns 06:59:59.999 of next day', () => {
    const end = getBusinessDayEnd('2026-07-10');
    expect(end.getHours()).toBe(6);
    expect(end.getMinutes()).toBe(59);
    expect(end.getSeconds()).toBe(59);
    expect(end.getMilliseconds()).toBe(999);
    expect(end.getDate()).toBe(11);
  });
});

describe('parseBusinessDateParam', () => {
  it('parses start date as 07:00', () => {
    const result = parseBusinessDateParam('2026-07-10', false);
    expect(result.getHours()).toBe(7);
    expect(result.getDate()).toBe(10);
  });

  it('parses end date as 06:59 next day', () => {
    const result = parseBusinessDateParam('2026-07-10', true);
    expect(result.getHours()).toBe(6);
    expect(result.getMinutes()).toBe(59);
    expect(result.getDate()).toBe(11);
  });

  it('passes through non-YYYY-MM-DD strings to Date constructor', () => {
    const result = parseBusinessDateParam('2026-07-10T12:00:00', false);
    expect(result).toBeInstanceOf(Date);
  });
});

describe('groupByBusinessDay', () => {
  it('groups 3am to previous day', () => {
    expect(groupByBusinessDay(new Date(2026, 6, 11, 3, 0, 0))).toBe('2026-07-10');
  });

  it('groups 8am to same day', () => {
    expect(groupByBusinessDay(new Date(2026, 6, 11, 8, 0, 0))).toBe('2026-07-11');
  });
});
