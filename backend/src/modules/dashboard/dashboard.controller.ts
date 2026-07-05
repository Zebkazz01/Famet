import { Request, Response } from "express";
import { Decimal } from "@prisma/client/runtime/library";
import { prisma } from "../../config/database";

export async function getKPIs(req: Request, res: Response) {
  const date = req.query.date ? String(req.query.date) : new Date().toISOString().split("T")[0];
  const startOfDay = new Date(date + "T00:00:00");
  const endOfDay = new Date(date + "T23:59:59");

  // Ventas del día
  const sales = await prisma.sale.findMany({
    where: { createdAt: { gte: startOfDay, lte: endOfDay } },
  });

  const totalSales = sales.length;
  const totalRevenue = sales.reduce((sum, s) => sum.add(s.total), new Decimal(0));
  const avgTicket = totalSales > 0 ? totalRevenue.div(totalSales) : new Decimal(0);

  // Ventas del día anterior para comparación
  const prevDate = new Date(startOfDay);
  prevDate.setDate(prevDate.getDate() - 1);
  const prevStart = new Date(prevDate.toISOString().split("T")[0] + "T00:00:00");
  const prevEnd = new Date(prevDate.toISOString().split("T")[0] + "T23:59:59");

  const prevSales = await prisma.sale.findMany({
    where: { createdAt: { gte: prevStart, lte: prevEnd } },
  });

  const prevTotalSales = prevSales.length;
  const prevTotalRevenue = prevSales.reduce((sum, s) => sum.add(s.total), new Decimal(0));

  // Desglose por método de pago (sólo ventas no-crédito)
  const cashSales = sales.filter((s) => !(s as any).isCredit);
  const byPayment = {
    CASH: cashSales.filter((s) => s.paymentMethod === "CASH").reduce((sum, s) => sum.add(s.total), new Decimal(0)),
    CARD: cashSales.filter((s) => s.paymentMethod === "CARD").reduce((sum, s) => sum.add(s.total), new Decimal(0)),
    TRANSFER: cashSales.filter((s) => s.paymentMethod === "TRANSFER").reduce((sum, s) => sum.add(s.total), new Decimal(0)),
  };

  // Desglose de ventas a crédito (fiado) del día
  const creditSalesToday = sales.filter((s) => (s as any).isCredit);
  const creditSummary = {
    count: creditSalesToday.length,
    total: creditSalesToday.reduce((sum, s) => sum.add(s.total), new Decimal(0)),
    pending: creditSalesToday.reduce((sum, s) => sum.add((s as any).creditBalance ?? 0), new Decimal(0)),
  };

  // Movimientos de caja del día
  const cashMovements = await prisma.cashMovement.findMany({
    where: { createdAt: { gte: startOfDay, lte: endOfDay } },
  });

  const cashIn = cashMovements
    .filter((m) => m.type === "CASH_IN")
    .reduce((sum, m) => sum.add(m.amount), new Decimal(0));
  const cashOut = cashMovements
    .filter((m) => m.type === "CASH_OUT")
    .reduce((sum, m) => sum.add(m.amount), new Decimal(0));

  return res.json({
    date,
    totalSales,
    totalRevenue,
    avgTicket,
    prevTotalSales,
    prevTotalRevenue,
    byPayment,
    credit: creditSummary,
    cashIn,
    cashOut,
  });
}

/**
 * Analytics extendido para Dashboard con graficas.
 * GET /api/dashboard/analytics?days=30
 *
 * Retorna:
 *  - dailySeries: ventas/ingresos/gastos por dia (N dias)
 *  - byCategory: top categorias por ingreso
 *  - topProducts: top 10 productos por ingreso
 *  - byHour: distribucion ventas por hora del dia
 *  - byPaymentMethod: ventas por metodo de pago
 *  - byUser: ventas por vendedor/cajero
 *  - lowStock: productos con stock bajo
 *  - expiringSoon: productos por vencer
 *  - forecast: prediccion proximos 7 dias (regresion lineal simple)
 *  - topProductsForecast: top productos predichos
 */
export async function getAnalytics(req: Request, res: Response) {
  let start: Date, end: Date, days: number;
  if (req.query.from && req.query.to) {
    start = new Date(String(req.query.from) + "T00:00:00");
    end   = new Date(String(req.query.to)   + "T23:59:59");
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) {
      return res.status(400).json({ error: "Rango de fechas inválido" });
    }
    days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86400000) + 1);
  } else {
    days = Math.min(365, Math.max(1, Number(req.query.days) || 30));
    end = new Date();
    end.setHours(23, 59, 59, 999);
    start = new Date(end);
    start.setDate(start.getDate() - days + 1);
    start.setHours(0, 0, 0, 0);
  }

  const [sales, expenses, products, batches] = await Promise.all([
    prisma.sale.findMany({
      where: { createdAt: { gte: start, lte: end }, corrected: false },
      include: {
        items: { include: { product: { include: { category: true } } } },
        user: { select: { firstName: true, lastName: true, id: true } },
      },
    }),
    prisma.expense.findMany({
      where: { createdAt: { gte: start, lte: end } },
    }).catch(() => [] as any[]),
    prisma.product.findMany({
      where: { active: true },
      include: { category: { select: { name: true } } },
    }),
    (prisma as any).productBatch?.findMany?.({
      where: { qty: { gt: 0 }, expiryDate: { not: null } },
      include: { product: { select: { id: true, name: true } } },
    }).catch(() => []) ?? [],
  ]);

  // === Daily series ===
  const dayMap = new Map<string, { revenue: number; count: number; expenses: number; profit: number }>();
  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    dayMap.set(key, { revenue: 0, count: 0, expenses: 0, profit: 0 });
  }
  for (const s of sales) {
    const k = s.createdAt.toISOString().slice(0, 10);
    const e = dayMap.get(k);
    if (e) { e.revenue += Number(s.total); e.count++; }
  }
  for (const ex of expenses) {
    const k = ex.createdAt.toISOString().slice(0, 10);
    const e = dayMap.get(k);
    if (e) e.expenses += Number(ex.amount);
  }
  const dailySeries = Array.from(dayMap.entries()).map(([date, v]) => ({
    date,
    revenue: v.revenue,
    count: v.count,
    expenses: v.expenses,
    profit: v.revenue - v.expenses,
  }));

  // === By category ===
  const catMap = new Map<string, { name: string; revenue: number; qty: number }>();
  for (const s of sales) {
    for (const it of s.items) {
      const cat = it.product?.category?.name || "Sin categoria";
      const e = catMap.get(cat) || { name: cat, revenue: 0, qty: 0 };
      e.revenue += Number(it.subtotal);
      e.qty += Number(it.quantity);
      catMap.set(cat, e);
    }
  }
  const byCategory = Array.from(catMap.values()).sort((a, b) => b.revenue - a.revenue);

  // === Top products ===
  const prodMap = new Map<number, { id: number; name: string; revenue: number; qty: number }>();
  for (const s of sales) {
    for (const it of s.items) {
      if (!it.product) continue;
      const e = prodMap.get(it.product.id) || { id: it.product.id, name: it.product.name, revenue: 0, qty: 0 };
      e.revenue += Number(it.subtotal);
      e.qty += Number(it.quantity);
      prodMap.set(it.product.id, e);
    }
  }
  const topProducts = Array.from(prodMap.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 10);

  // === By hour of day ===
  const hourArr: { hour: number; revenue: number; count: number }[] = [];
  for (let h = 0; h < 24; h++) hourArr.push({ hour: h, revenue: 0, count: 0 });
  for (const s of sales) {
    const h = s.createdAt.getHours();
    hourArr[h].revenue += Number(s.total);
    hourArr[h].count++;
  }
  const byHour = hourArr;

  // === By payment method ===
  const pmMap = new Map<string, { method: string; total: number; count: number }>();
  for (const s of sales) {
    const e = pmMap.get(s.paymentMethod) || { method: s.paymentMethod, total: 0, count: 0 };
    e.total += Number(s.total);
    e.count++;
    pmMap.set(s.paymentMethod, e);
  }
  const byPaymentMethod = Array.from(pmMap.values());

  // === By user (vendedor/cajero) ===
  const userMap = new Map<number, { id: number; name: string; revenue: number; count: number }>();
  for (const s of sales) {
    const id = s.user?.id || s.userId;
    const name = s.user ? `${s.user.firstName} ${s.user.lastName}`.trim() : `Usuario ${id}`;
    const e = userMap.get(id) || { id, name, revenue: 0, count: 0 };
    e.revenue += Number(s.total);
    e.count++;
    userMap.set(id, e);
  }
  const byUser = Array.from(userMap.values()).sort((a, b) => b.revenue - a.revenue);

  // === Low stock ===
  const lowStock = products
    .filter((p) => Number(p.stockQty) <= Number(p.minStock) && Number(p.minStock) > 0)
    .map((p) => ({
      id: p.id,
      name: p.name,
      stockQty: Number(p.stockQty),
      minStock: Number(p.minStock),
      category: p.category?.name || "",
    }))
    .sort((a, b) => (a.stockQty / Math.max(a.minStock, 1)) - (b.stockQty / Math.max(b.minStock, 1)))
    .slice(0, 20);

  // === Expiring soon (7 dias) ===
  const sevenDays = new Date();
  sevenDays.setDate(sevenDays.getDate() + 7);
  const expiringSoon = batches
    .filter((b: any) => b.expiryDate && new Date(b.expiryDate) <= sevenDays && Number(b.qty) > 0)
    .map((b: any) => ({
      id: b.id,
      productId: b.productId,
      productName: b.product?.name || "",
      expiryDate: b.expiryDate,
      qty: Number(b.qty),
      daysLeft: Math.ceil((new Date(b.expiryDate).getTime() - Date.now()) / 86400000),
    }))
    .sort((a: any, b: any) => a.daysLeft - b.daysLeft)
    .slice(0, 20);

  // === Forecast 7 dias (regresion lineal simple sobre dailySeries) ===
  const forecast = linearForecast(dailySeries.map((d) => d.revenue), 7);
  const forecastSeries: { date: string; revenue: number }[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(end);
    d.setDate(d.getDate() + i + 1);
    forecastSeries.push({ date: d.toISOString().slice(0, 10), revenue: Math.max(0, forecast[i]) });
  }

  // === Top products forecast: tasa diaria de venta * 7 ===
  const topProductsForecast = topProducts.slice(0, 10).map((p) => ({
    ...p,
    qtyPerDay: p.qty / days,
    revenuePerDay: p.revenue / days,
    projectedQty7d: (p.qty / days) * 7,
    projectedRevenue7d: (p.revenue / days) * 7,
  }));

  // === Credit summary (fiado) ===
  const creditSales = sales.filter((s) => (s as any).isCredit);
  const creditSummary = {
    salesCount: creditSales.length,
    totalAmount: creditSales.reduce((s, x) => s + Number(x.total), 0),
    pendingAmount: creditSales.reduce((s, x) => s + Number((x as any).creditBalance ?? 0), 0),
    customersWithDebt: await prisma.customer.count({ where: { currentDebt: { gt: 0 } } }),
  };

  // === Resumen totales ===
  const totalRevenue = sales.reduce((s, x) => s + Number(x.total), 0);
  const totalExpenses = expenses.reduce((s, x) => s + Number(x.amount), 0);
  const totalCount = sales.length;

  return res.json({
    range: { start: start.toISOString(), end: end.toISOString(), days },
    totals: {
      revenue: totalRevenue,
      expenses: totalExpenses,
      profit: totalRevenue - totalExpenses,
      salesCount: totalCount,
      avgTicket: totalCount > 0 ? totalRevenue / totalCount : 0,
    },
    dailySeries,
    byCategory,
    topProducts,
    byHour,
    byPaymentMethod,
    byUser,
    creditSummary,
    lowStock,
    expiringSoon,
    forecastSeries,
    topProductsForecast,
  });
}

/** Regresion lineal simple para predecir N pasos siguientes a una serie. */
function linearForecast(series: number[], steps: number): number[] {
  const n = series.length;
  if (n < 2) return new Array(steps).fill(series[0] ?? 0);
  // Calcular pendiente m y ordenada b: y = m*x + b
  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += series[i];
    sumXY += i * series[i];
    sumXX += i * i;
  }
  const m = (n * sumXY - sumX * sumY) / Math.max(1, n * sumXX - sumX * sumX);
  const b = (sumY - m * sumX) / n;
  return Array.from({ length: steps }, (_, i) => m * (n + i) + b);
}
