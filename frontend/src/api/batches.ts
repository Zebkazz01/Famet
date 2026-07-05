import client from './client';

export interface Batch {
  id: number;
  productId: number;
  batchCode: string | null;
  expiryDate: string;
  qty: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ExpiringBatch {
  id: number;
  productId: number;
  productName: string;
  batchCode: string | null;
  expiryDate: string;
  qty: number;
  daysLeft: number;
}

export async function listForProduct(productId: number): Promise<{ batches: Batch[]; totalQty: number }> {
  const res = await client.get(`/products/${productId}/batches`);
  return res.data;
}

export async function create(productId: number, data: {
  batchCode?: string | null;
  expiryDate: string;
  qty: number;
  notes?: string | null;
}): Promise<Batch> {
  const res = await client.post(`/products/${productId}/batches`, data);
  return res.data;
}

export async function update(id: number, data: Partial<{
  batchCode: string | null;
  expiryDate: string;
  qty: number;
  notes: string | null;
}>): Promise<Batch> {
  const res = await client.put(`/batches/${id}`, data);
  return res.data;
}

export async function remove(id: number): Promise<void> {
  await client.delete(`/batches/${id}`);
}

export async function expiring(days = 30): Promise<ExpiringBatch[]> {
  const res = await client.get('/products/expiring', { params: { days } });
  return res.data;
}
