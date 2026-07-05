import client from './client';

export interface Customer {
  id: number;
  name: string;
  phone: string | null;
  document: string | null;
  notes: string | null;
  creditLimit: string;
  currentDebt: string;
  discountPercent: string | null;
  active: boolean;
  createdAt: string;
  _count?: { sales: number; payments: number };
}

export interface CustomerPayment {
  id: number;
  customerId: number;
  saleId: number | null;
  amount: string;
  method: 'CASH' | 'CARD' | 'TRANSFER' | 'OTHER';
  reference: string | null;
  evidence: string | null;
  notes: string | null;
  userId: number;
  createdAt: string;
  customer?: { id: number; name: string };
}

export async function list(params: { q?: string; active?: boolean } = {}): Promise<Customer[]> {
  const res = await client.get('/customers', { params });
  return res.data;
}

export async function getOne(id: number): Promise<Customer & { sales: any[]; payments: CustomerPayment[] }> {
  const res = await client.get(`/customers/${id}`);
  return res.data;
}

export async function create(data: Partial<Customer>): Promise<Customer> {
  const res = await client.post('/customers', data);
  return res.data;
}

export async function update(id: number, data: Partial<Customer>): Promise<Customer> {
  const res = await client.put(`/customers/${id}`, data);
  return res.data;
}

export async function remove(id: number): Promise<void> {
  await client.delete(`/customers/${id}`);
}

export async function createPayment(data: {
  customerId: number;
  saleId?: number | null;
  amount: number;
  method?: 'CASH' | 'CARD' | 'TRANSFER' | 'OTHER';
  reference?: string;
  evidence?: string;
  notes?: string;
}): Promise<CustomerPayment> {
  const res = await client.post('/customers/payments', data);
  return res.data;
}

export async function listPayments(customerId?: number): Promise<CustomerPayment[]> {
  const res = await client.get('/customers/payments/list', { params: { customerId } });
  return res.data;
}
