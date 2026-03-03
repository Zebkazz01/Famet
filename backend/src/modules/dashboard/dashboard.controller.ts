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

  // Desglose por método de pago
  const byPayment = {
    CASH: sales.filter((s) => s.paymentMethod === "CASH").reduce((sum, s) => sum.add(s.total), new Decimal(0)),
    CARD: sales.filter((s) => s.paymentMethod === "CARD").reduce((sum, s) => sum.add(s.total), new Decimal(0)),
    TRANSFER: sales.filter((s) => s.paymentMethod === "TRANSFER").reduce((sum, s) => sum.add(s.total), new Decimal(0)),
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
    cashIn,
    cashOut,
  });
}
