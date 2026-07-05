import client from './client';

export interface ResolvedBarcode {
  isNew: boolean;
  code: string;
  category: { id: number; name: string; color: string } | null;
  exactProduct: any | null;
  lastProduct: any | null;
  suggestedProduct: any | null;
  knownAliases: Array<{
    id: number;
    barcode: string;
    categoryId: number;
    lastProductId: number | null;
    timesSeen: number;
    lastSeenAt: string;
  }>;
}

export async function resolve(code: string): Promise<ResolvedBarcode> {
  const res = await client.get(`/barcodes/resolve/${encodeURIComponent(code)}`);
  return res.data;
}

export async function history(categoryId?: number) {
  const res = await client.get('/barcodes/history', { params: categoryId ? { categoryId } : {} });
  return res.data;
}

export async function assignToProduct(code: string, productId: number) {
  const res = await client.post('/barcodes/assign', { code, productId });
  return res.data;
}

export async function remove(id: number) {
  await client.delete(`/barcodes/${id}`);
}
