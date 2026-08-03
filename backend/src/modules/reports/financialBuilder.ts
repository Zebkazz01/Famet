import { prisma } from "../../config/database";
import { parseBusinessDateParam, getBusinessDayDate, groupByBusinessDay } from "../../utils/businessDay";

export interface FinancialRange {
  from: Date;
  to: Date;
}

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
  /** Solo se incluye en cierre mensual; null en reportes ad-hoc. */
  daily?: Array<{ date: string; sales: number; revenue: number; expenses: number; net: number }>;
}

export async function build(range: FinancialRange, opts: { includeDaily?: boolean } = {}): Promise<FinancialReport> {
  const { from, to } = range;

  const [sales, expenses, cashMovements] = await Promise.all([
    prisma.sale.findMany({
      where: { createdAt: { gte: from, lte: to } },
      include: {
        items: { include: { product: { include: { category: true } } } },
      },
    }),
    prisma.expense.findMany({
      where: { date: { gte: from, lte: to } },
      select: { amount: true, category: true, date: true },
    }),
    prisma.cashMovement.findMany({
      where: { createdAt: { gte: from, lte: to } },
      select: { type: true, amount: true },
    }),
  ]);

  // Totales generales
  let grossRevenue = 0;
  let discountTotal = 0;
  let totalCost = 0;
  const productMap = new Map<number, ProductSold>();
  const categoryMap = new Map<number | null, CategoryAgg>();
  const paymentMap = new Map<string, PaymentAgg>();

  for (const s of sales) {
    discountTotal += Number(s.discountTotal);
    const pm = paymentMap.get(s.paymentMethod) || { method: s.paymentMethod, total: 0, count: 0 };
    pm.total += Number(s.total);
    pm.count += 1;
    paymentMap.set(s.paymentMethod, pm);
    for (const it of s.items) {
      const gross = Number(it.unitPrice) * Number(it.quantity);
      const itemNet = Number(it.subtotal);
      const itemCost = it.product.cost ? Number(it.product.cost) * Number(it.quantity) : 0;
      grossRevenue += gross;
      totalCost += itemCost;
      // Producto
      const p = productMap.get(it.productId) || {
        productId: it.productId,
        name: it.product.name,
        qty: 0,
        revenue: 0,
        cost: 0,
        profit: 0,
      };
      p.qty += Number(it.quantity);
      p.revenue += itemNet;
      p.cost += itemCost;
      p.profit = p.revenue - p.cost;
      productMap.set(it.productId, p);
      // Categoría
      const cid = it.product.categoryId ?? null;
      const cname = it.product.category?.name ?? "Sin categoría";
      const c = categoryMap.get(cid) || { categoryId: cid, name: cname, qty: 0, revenue: 0 };
      c.qty += Number(it.quantity);
      c.revenue += itemNet;
      categoryMap.set(cid, c);
    }
  }
  const netRevenue = grossRevenue - discountTotal;
  const grossProfit = netRevenue - totalCost;

  const expensesTotal = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const expensesByCategoryMap = new Map<string, number>();
  for (const e of expenses) {
    expensesByCategoryMap.set(e.category, (expensesByCategoryMap.get(e.category) || 0) + Number(e.amount));
  }
  const expensesByCategory = Array.from(expensesByCategoryMap.entries())
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);

  let cashIn = 0;
  let cashOut = 0;
  for (const m of cashMovements) {
    if (m.type === "CASH_IN") cashIn += Number(m.amount);
    else cashOut += Number(m.amount);
  }
  const netIncome = grossProfit - expensesTotal;

  const productsArr = Array.from(productMap.values());
  const topProducts = [...productsArr].sort((a, b) => b.revenue - a.revenue).slice(0, 10);
  const worstProducts = [...productsArr].sort((a, b) => a.revenue - b.revenue).slice(0, 5);
  const byCategory = Array.from(categoryMap.values()).sort((a, b) => b.revenue - a.revenue);
  const byPayment = Array.from(paymentMap.values()).sort((a, b) => b.total - a.total);

  const result: FinancialReport = {
    range: { from: from.toISOString(), to: to.toISOString() },
    totals: {
      salesCount: sales.length,
      grossRevenue,
      discountTotal,
      netRevenue,
      totalCost,
      grossProfit,
      expensesTotal,
      cashIn,
      cashOut,
      netIncome,
    },
    topProducts,
    worstProducts,
    byCategory,
    byPayment,
    expensesByCategory,
  };

  if (opts.includeDaily) {
    const dayMap = new Map<string, { date: string; sales: number; revenue: number; expenses: number; net: number }>();
    for (const s of sales) {
      const d = groupByBusinessDay(s.createdAt);
      const agg = dayMap.get(d) || { date: d, sales: 0, revenue: 0, expenses: 0, net: 0 };
      agg.sales += 1;
      agg.revenue += Number(s.total);
      dayMap.set(d, agg);
    }
    for (const e of expenses) {
      const d = groupByBusinessDay(e.date);
      const agg = dayMap.get(d) || { date: d, sales: 0, revenue: 0, expenses: 0, net: 0 };
      agg.expenses += Number(e.amount);
      dayMap.set(d, agg);
    }
    const daily = Array.from(dayMap.values())
      .map((d) => ({ ...d, net: d.revenue - d.expenses }))
      .sort((a, b) => a.date.localeCompare(b.date));
    result.daily = daily;
  }

  return result;
}

function parseDateParam(value: string, endOfDay: boolean): Date {
  return parseBusinessDateParam(value, endOfDay);
}

export function parseRange(from?: string, to?: string): FinancialRange {
  const today = getBusinessDayDate();
  const f = from ? parseDateParam(from, false) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const t = to ? parseDateParam(to, true) : parseDateParam(today, true);
  return { from: f, to: t };
}

export function parseMonth(month: string): FinancialRange {
  const [y, m] = month.split("-").map(Number);
  const from = new Date(y, m - 1, 1);
  const to = new Date(y, m, 0, 23, 59, 59);
  return { from, to };
}
