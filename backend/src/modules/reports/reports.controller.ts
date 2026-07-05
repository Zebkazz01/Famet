import { Request, Response } from "express";
import { prisma } from "../../config/database";
import { build, parseRange, parseMonth } from "./financialBuilder";
import { renderFinancialPdfAsync } from "./pdfReports";
import { renderFinancialXlsx } from "./xlsxReports";

function fmtFilename(prefix: string, ext: string, range: { from: string; to: string }) {
  const f = range.from.slice(0, 10);
  const t = range.to.slice(0, 10);
  return `${prefix}_${f}_${t}.${ext}`;
}

async function respondReport(res: Response, format: string, report: any, title: string, prefix: string) {
  if (format === "pdf") {
    const buf = await renderFinancialPdfAsync(report, title);
    const fn = fmtFilename(prefix, "pdf", { from: report.range.from, to: report.range.to });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="${fn}"`);
    return res.end(buf);
  }
  if (format === "xlsx") {
    const buf = await renderFinancialXlsx(report, title);
    const fn = fmtFilename(prefix, "xlsx", { from: report.range.from, to: report.range.to });
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="${fn}"`);
    return res.end(buf);
  }
  return res.json(report);
}

export async function salesReport(req: Request, res: Response) {
  const range = parseRange(req.query.from as string, req.query.to as string);
  const format = (req.query.format as string) || "json";
  const report = await build(range, { includeDaily: true });
  return respondReport(res, format, report, "Reporte de Ventas", "ventas");
}

export async function financialReport(req: Request, res: Response) {
  const monthStr = req.query.month as string | undefined;
  const range = monthStr ? parseMonth(monthStr) : parseRange(req.query.from as string, req.query.to as string);
  const format = (req.query.format as string) || "json";
  const report = await build(range, { includeDaily: true });
  return respondReport(res, format, report, "Estado de Resultados", "estado_resultados");
}

export async function expensesReport(req: Request, res: Response) {
  const range = parseRange(req.query.from as string, req.query.to as string);
  const format = (req.query.format as string) || "json";
  const report = await build(range);
  // Recortar a foco gastos
  const focused = {
    ...report,
    topProducts: [],
    byCategory: [],
    byPayment: [],
  };
  return respondReport(res, format, focused, "Reporte de Gastos", "gastos");
}

export async function inventoryReport(req: Request, res: Response) {
  const format = (req.query.format as string) || "json";
  const products = await prisma.product.findMany({
    where: { active: true },
    include: { category: true, supplier: { select: { name: true } } },
    orderBy: { name: "asc" },
  });
  const data = products.map((p) => ({
    name: p.name,
    category: p.category?.name || "—",
    supplier: p.supplier?.name || "—",
    stockQty: Number(p.stockQty),
    minStock: Number(p.minStock),
    price: Number(p.price),
    cost: p.cost ? Number(p.cost) : 0,
    stockValue: Number(p.stockQty) * (p.cost ? Number(p.cost) : 0),
  }));
  const totalValue = data.reduce((s, x) => s + x.stockValue, 0);
  if (format === "xlsx") {
    const ExcelJS = (await import("exceljs")).default;
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Inventario");
    ws.columns = [
      { header: "Producto", key: "name", width: 30 },
      { header: "Categoría", key: "category", width: 20 },
      { header: "Proveedor", key: "supplier", width: 20 },
      { header: "Stock", key: "stockQty", width: 10 },
      { header: "Mín", key: "minStock", width: 8 },
      { header: "Precio", key: "price", width: 12, style: { numFmt: '"$"#,##0' } },
      { header: "Costo", key: "cost", width: 12, style: { numFmt: '"$"#,##0' } },
      { header: "Valor stock", key: "stockValue", width: 15, style: { numFmt: '"$"#,##0' } },
    ];
    ws.getRow(1).font = { bold: true };
    for (const r of data) ws.addRow(r);
    ws.addRow({});
    ws.addRow({ name: "TOTAL VALOR", stockValue: totalValue }).font = { bold: true };
    const ab = await wb.xlsx.writeBuffer();
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="inventario_${new Date().toISOString().slice(0,10)}.xlsx"`);
    return res.end(Buffer.from(ab as ArrayBuffer));
  }
  if (format === "pdf") {
    try {
      const { renderInventoryPdf } = await import("./pdfReports");
      const buffer = await renderInventoryPdf(data, totalValue);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="inventario_${new Date().toISOString().slice(0,10)}.pdf"`);
      return res.end(buffer);
    } catch (err: any) {
      return res.status(500).json({ error: `Error generando PDF: ${err.message}` });
    }
  }
  return res.json({ items: data, totalValue });
}

export async function closeMonth(req: Request, res: Response) {
  const { month } = req.body as { month: string };
  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return res.status(400).json({ error: "Formato de mes inválido (YYYY-MM)" });
  }
  const userId = req.user!.userId;
  const range = parseMonth(month);
  const report = await build(range, { includeDaily: true });

  const data = {
    month,
    totalSales: report.totals.netRevenue,
    totalExpenses: report.totals.expensesTotal,
    totalDiscounts: report.totals.discountTotal,
    totalCashIn: report.totals.cashIn,
    totalCashOut: report.totals.cashOut,
    netIncome: report.totals.netIncome,
    salesCount: report.totals.salesCount,
    topProductsJson: report.topProducts as any,
    byCategoryJson: report.byCategory as any,
    byPaymentJson: report.byPayment as any,
    createdBy: userId,
  };

  const statement = await prisma.monthlyStatement.upsert({
    where: { month },
    update: { ...data, createdBy: userId },
    create: data,
  });
  return res.json(statement);
}

export async function listStatements(req: Request, res: Response) {
  const year = req.query.year ? Number(req.query.year) : null;
  const where: any = {};
  if (year) {
    where.month = { startsWith: String(year) + "-" };
  }
  const items = await prisma.monthlyStatement.findMany({
    where,
    orderBy: { month: "desc" },
  });
  return res.json(items);
}

export async function getStatement(req: Request, res: Response) {
  const month = String(req.params.month);
  const item = await prisma.monthlyStatement.findUnique({ where: { month } });
  if (!item) return res.status(404).json({ error: "Estado mensual no encontrado" });
  return res.json(item);
}

export async function getStatementPdf(req: Request, res: Response) {
  const month = String(req.params.month);
  const item = await prisma.monthlyStatement.findUnique({ where: { month } });
  if (!item) return res.status(404).json({ error: "Estado mensual no encontrado" });
  const range = parseMonth(month);
  const report = await build(range, { includeDaily: true });
  const buf = await renderFinancialPdfAsync(report, `Estado de Resultados ${month}`);
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `inline; filename="estado_${month}.pdf"`);
  return res.end(buf);
}
