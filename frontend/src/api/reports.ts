import client from './client';

export interface ProductSold {
  productId: number;
  name: string;
  qty: number;
  revenue: number;
  cost: number;
  profit: number;
}

export interface CategoryAgg {
  categoryId: number | null;
  name: string;
  qty: number;
  revenue: number;
}

export interface PaymentAgg {
  method: string;
  total: number;
  count: number;
}

export interface FinancialReport {
  range: { from: string; to: string };
  totals: {
    salesCount: number;
    grossRevenue: number;
    discountTotal: number;
    netRevenue: number;
    totalCost: number;
    grossProfit: number;
    expensesTotal: number;
    cashIn: number;
    cashOut: number;
    netIncome: number;
  };
  topProducts: ProductSold[];
  worstProducts: ProductSold[];
  byCategory: CategoryAgg[];
  byPayment: PaymentAgg[];
  expensesByCategory: Array<{ category: string; amount: number }>;
  daily?: Array<{ date: string; sales: number; revenue: number; expenses: number; net: number }>;
}

export interface MonthlyStatement {
  id: number;
  month: string;
  totalSales: string | number;
  totalExpenses: string | number;
  totalDiscounts: string | number;
  totalCashIn: string | number;
  totalCashOut: string | number;
  netIncome: string | number;
  salesCount: number;
  topProductsJson: ProductSold[];
  byCategoryJson: CategoryAgg[];
  byPaymentJson: PaymentAgg[];
  createdBy: number;
  createdAt: string;
}

export async function salesReport(params: { from: string; to: string }): Promise<FinancialReport> {
  const res = await client.get('/reports/sales', { params });
  return res.data;
}

export async function financialReport(params: { from?: string; to?: string; month?: string }): Promise<FinancialReport> {
  const res = await client.get('/reports/financial', { params });
  return res.data;
}

export async function inventoryReportJson(): Promise<{ items: any[]; totalValue: number }> {
  const res = await client.get('/reports/inventory');
  return res.data;
}

export async function downloadReport(
  type: 'sales' | 'financial' | 'expenses' | 'inventory',
  format: 'pdf' | 'xlsx',
  params: Record<string, string> = {},
): Promise<void> {
  const res = await client.get(`/reports/${type}`, {
    params: { ...params, format },
    responseType: 'blob',
  });
  const blob = new Blob([res.data], {
    type: format === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const dispo = res.headers['content-disposition'] as string | undefined;
  const m = dispo?.match(/filename="?([^"]+)"?/);
  a.download = m?.[1] || `${type}.${format}`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function closeMonth(month: string): Promise<MonthlyStatement> {
  const res = await client.post('/reports/monthly-close', { month });
  return res.data;
}

export async function listStatements(year?: number): Promise<MonthlyStatement[]> {
  const res = await client.get('/reports/monthly-statements', { params: year ? { year } : {} });
  return res.data;
}

export async function getStatement(month: string): Promise<MonthlyStatement> {
  const res = await client.get(`/reports/monthly-statements/${month}`);
  return res.data;
}
