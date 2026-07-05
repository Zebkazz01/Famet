import client from './client';

export type PurchaseOrderStatus = 'DRAFT' | 'SENT' | 'PARTIAL' | 'RECEIVED' | 'CANCELLED';

export interface PurchaseOrderItem {
  id: number;
  orderId: number;
  productId: number;
  quantityOrdered: string;
  quantityReceived: string;
  unitCost: string;
  subtotal: string;
  notes: string | null;
  product?: { id: number; name: string; sku: string | null; weightUnit: string; saleType: string };
}

export interface PurchaseOrder {
  id: number;
  code: string;
  supplierId: number;
  status: PurchaseOrderStatus;
  expectedDate: string | null;
  receivedDate: string | null;
  subtotal: string;
  tax: string;
  total: string;
  notes: string | null;
  attachment: string | null;
  createdBy: number;
  receivedBy: number | null;
  createdAt: string;
  supplier?: { id: number; name: string; nit: string | null };
  items?: PurchaseOrderItem[];
  _count?: { items: number };
}

export interface CreateOrderInput {
  supplierId: number;
  expectedDate?: string;
  notes?: string;
  tax?: number;
  items: Array<{ productId: number; quantityOrdered: number; unitCost: number; notes?: string }>;
}

export interface ReceiveInput {
  items: Array<{ itemId: number; quantityReceived: number }>;
  notes?: string;
  attachment?: string;
}

export async function list(params: { status?: string; supplierId?: number; from?: string; to?: string } = {}): Promise<PurchaseOrder[]> {
  const res = await client.get('/purchase-orders', { params });
  return res.data;
}

export async function getOne(id: number): Promise<PurchaseOrder> {
  const res = await client.get(`/purchase-orders/${id}`);
  return res.data;
}

export async function create(data: CreateOrderInput): Promise<PurchaseOrder> {
  const res = await client.post('/purchase-orders', data);
  return res.data;
}

export async function update(id: number, data: Partial<CreateOrderInput> & { status?: PurchaseOrderStatus }): Promise<PurchaseOrder> {
  const res = await client.put(`/purchase-orders/${id}`, data);
  return res.data;
}

export async function receive(id: number, data: ReceiveInput): Promise<PurchaseOrder> {
  const res = await client.post(`/purchase-orders/${id}/receive`, data);
  return res.data;
}

export async function cancel(id: number): Promise<PurchaseOrder> {
  const res = await client.post(`/purchase-orders/${id}/cancel`, {});
  return res.data;
}
