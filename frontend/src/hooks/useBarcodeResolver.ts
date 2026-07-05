import { useCallback, useState } from 'react';
import * as barcodesApi from '../api/barcodes';
import type { ResolvedBarcode } from '../api/barcodes';

export interface UseBarcodeResolverState {
  loading: boolean;
  error: string | null;
  resolved: ResolvedBarcode | null;
}

export function useBarcodeResolver() {
  const [state, setState] = useState<UseBarcodeResolverState>({
    loading: false,
    error: null,
    resolved: null,
  });

  const resolve = useCallback(async (code: string): Promise<ResolvedBarcode | null> => {
    setState({ loading: true, error: null, resolved: null });
    try {
      const result = await barcodesApi.resolve(code);
      setState({ loading: false, error: null, resolved: result });
      return result;
    } catch (e: any) {
      const msg = e?.response?.data?.error || 'Error al resolver código';
      setState({ loading: false, error: msg, resolved: null });
      return null;
    }
  }, []);

  const reset = useCallback(() => {
    setState({ loading: false, error: null, resolved: null });
  }, []);

  const assign = useCallback(async (code: string, productId: number) => {
    await barcodesApi.assignToProduct(code, productId);
  }, []);

  return { ...state, resolve, reset, assign };
}
