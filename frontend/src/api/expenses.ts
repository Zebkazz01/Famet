import client from './client';

export type ExpensePaymentMethod = 'CASH' | 'CARD' | 'TRANSFER';

export interface Expense {
  id: number;
  amount: string | number;
  description: string;
  category: string;
  date: string;
  userId: number;
  evidenceUrl: string | null;
  paymentMethod: ExpensePaymentMethod | null;
  createdAt: string;
  updatedAt: string;
  user?: { firstName: string; lastName: string };
}

export interface ExpenseListParams {
  from?: string;
  to?: string;
  category?: string;
  userId?: number;
  q?: string;
}

export interface ExpenseSummary {
  month: string;
  totalAmount: number;
  count: number;
  dailyAvg: number;
  topCategories: Array<{ category: string; amount: number }>;
}

export async function list(params: ExpenseListParams = {}): Promise<Expense[]> {
  const res = await client.get('/expenses', { params });
  return res.data;
}

export async function get(id: number): Promise<Expense> {
  const res = await client.get(`/expenses/${id}`);
  return res.data;
}

export async function create(data: {
  amount: number;
  description: string;
  category: string;
  date: string;
  paymentMethod?: ExpensePaymentMethod | null;
}, evidence?: File | null): Promise<Expense> {
  const fd = new FormData();
  fd.append('amount', String(data.amount));
  fd.append('description', data.description);
  fd.append('category', data.category);
  fd.append('date', data.date);
  if (data.paymentMethod) fd.append('paymentMethod', data.paymentMethod);
  if (evidence) fd.append('evidence', evidence);
  const res = await client.post('/expenses', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
  return res.data;
}

export async function update(id: number, data: Partial<{
  amount: number;
  description: string;
  category: string;
  date: string;
  paymentMethod: ExpensePaymentMethod | null;
}>, evidence?: File | null): Promise<Expense> {
  const fd = new FormData();
  if (data.amount !== undefined) fd.append('amount', String(data.amount));
  if (data.description !== undefined) fd.append('description', data.description);
  if (data.category !== undefined) fd.append('category', data.category);
  if (data.date !== undefined) fd.append('date', data.date);
  if (data.paymentMethod !== undefined && data.paymentMethod !== null) fd.append('paymentMethod', data.paymentMethod);
  if (evidence) fd.append('evidence', evidence);
  const res = await client.put(`/expenses/${id}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
  return res.data;
}

export async function remove(id: number): Promise<void> {
  await client.delete(`/expenses/${id}`);
}

export async function summary(month?: string): Promise<ExpenseSummary> {
  const res = await client.get('/expenses/summary', { params: month ? { month } : {} });
  return res.data;
}

export const EXPENSE_CATEGORY_SUGGESTIONS = [
  'Servicios públicos',
  'Arriendo',
  'Salarios',
  'Inventario',
  'Mantenimiento',
  'Marketing',
  'Transporte',
  'Impuestos',
  'Suministros',
  'Otros',
];
