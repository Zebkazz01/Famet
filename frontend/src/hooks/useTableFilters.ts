import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

type FilterValue = string | number | boolean | string[] | number[] | { from?: string; to?: string } | null | undefined;

export type FiltersState = Record<string, FilterValue>;

interface UseTableFiltersOptions {
  /** Sincroniza el estado con la URL (searchParams). Default: false. */
  syncUrl?: boolean;
  /** Prefijo opcional para todas las keys en la URL (evita colisiones entre tablas en la misma página). */
  urlPrefix?: string;
}

function isEmpty(v: FilterValue): boolean {
  if (v === null || v === undefined || v === '') return true;
  if (Array.isArray(v)) return v.length === 0;
  if (typeof v === 'object' && 'from' in v && 'to' in v) {
    return !v.from && !v.to;
  }
  return false;
}

function serialize(v: FilterValue): string | null {
  if (isEmpty(v)) return null;
  if (Array.isArray(v)) return v.join(',');
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

function deserialize(raw: string, sample: FilterValue): FilterValue {
  if (Array.isArray(sample)) return raw.split(',').filter(Boolean);
  if (typeof sample === 'object' && sample !== null && 'from' in sample) {
    try { return JSON.parse(raw); } catch { return sample; }
  }
  if (typeof sample === 'number') {
    const n = Number(raw);
    return Number.isFinite(n) ? n : 0;
  }
  if (typeof sample === 'boolean') return raw === 'true';
  return raw;
}

export function useTableFilters<T extends FiltersState>(
  initial: T,
  options: UseTableFiltersOptions = {},
) {
  const { syncUrl = false, urlPrefix = '' } = options;
  const initialRef = useRef(initial);
  const [searchParams, setSearchParams] = useSearchParams();

  const [filters, setFilters] = useState<T>(() => {
    if (!syncUrl) return initial;
    const next: any = { ...initial };
    for (const key of Object.keys(initial)) {
      const raw = searchParams.get(`${urlPrefix}${key}`);
      if (raw !== null) next[key] = deserialize(raw, initial[key]);
    }
    return next;
  });

  useEffect(() => {
    if (!syncUrl) return;
    const params = new URLSearchParams(searchParams);
    for (const key of Object.keys(filters)) {
      const value = filters[key];
      const ser = serialize(value);
      const urlKey = `${urlPrefix}${key}`;
      if (ser === null) params.delete(urlKey);
      else params.set(urlKey, ser);
    }
    setSearchParams(params, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, syncUrl, urlPrefix]);

  const setFilter = useCallback(<K extends keyof T>(key: K, value: T[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const clearOne = useCallback(<K extends keyof T>(key: K) => {
    setFilters((prev) => ({ ...prev, [key]: initialRef.current[key] }));
  }, []);

  const clear = useCallback(() => {
    setFilters({ ...initialRef.current });
  }, []);

  const activeCount = useMemo(() => {
    return Object.keys(filters).reduce((count, key) => {
      const cur = filters[key];
      const init = initialRef.current[key];
      if (isEmpty(cur)) return count;
      if (JSON.stringify(cur) === JSON.stringify(init)) return count;
      return count + 1;
    }, 0);
  }, [filters]);

  return { filters, setFilter, clearOne, clear, activeCount };
}
