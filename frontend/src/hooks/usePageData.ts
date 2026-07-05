import { useState, useEffect, useCallback } from 'react';
import client from '../api/client';

interface UsePageDataOptions {
  endpoints: string[];
  onSuccess?: (results: any[]) => void;
}

export function usePageData({ endpoints, onSuccess }: UsePageDataOptions) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    Promise.all(endpoints.map((url) => client.get(url).then((r) => r.data)))
      .then((results) => {
        onSuccess?.(results);
      })
      .catch((err) => {
        setError(err instanceof Error ? err : new Error(err?.response?.data?.error || 'Error al cargar datos'));
      })
      .finally(() => setLoading(false));
  }, [endpoints.join(',')]);

  useEffect(load, [load]);

  return { loading, error, retry: load };
}
