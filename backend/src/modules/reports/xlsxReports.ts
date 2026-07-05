import ExcelJS from "exceljs";
import * as configCache from "../../utils/configCache";
import { FinancialReport } from "./financialBuilder";

const moneyFmt = '"$"#,##0';

export async function renderFinancialXlsx(report: FinancialReport, title = "Estado de Resultados"): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = configCache.get("business_name") || "POS";
  wb.created = new Date();

  // Hoja Resumen
  const resumen = wb.addWorksheet("Resumen");
  resumen.columns = [
    { header: "Concepto", key: "concepto", width: 35 },
    { header: "Valor", key: "valor", width: 20, style: { numFmt: moneyFmt } },
  ];
  resumen.addRow({ concepto: title });
  resumen.getCell("A1").font = { bold: true, size: 14 };
  resumen.addRow({
    concepto: `Rango: ${new Date(report.range.from).toLocaleDateString("es-CO")} → ${new Date(report.range.to).toLocaleDateString("es-CO")}`,
  });
  resumen.addRow({});
  resumen.addRow({ concepto: "Ventas totales", valor: report.totals.salesCount });
  resumen.addRow({ concepto: "Ingresos brutos", valor: report.totals.grossRevenue });
  resumen.addRow({ concepto: "Descuentos aplicados", valor: -report.totals.discountTotal });
  resumen.addRow({ concepto: "Ingresos netos", valor: report.totals.netRevenue });
  resumen.getRow(resumen.lastRow!.number).font = { bold: true };
  resumen.addRow({ concepto: "Costo de productos vendidos", valor: -report.totals.totalCost });
  resumen.addRow({ concepto: "Utilidad bruta", valor: report.totals.grossProfit });
  resumen.getRow(resumen.lastRow!.number).font = { bold: true };
  resumen.addRow({ concepto: "Gastos operativos", valor: -report.totals.expensesTotal });
  resumen.addRow({ concepto: "Entradas de caja", valor: report.totals.cashIn });
  resumen.addRow({ concepto: "Salidas de caja", valor: -report.totals.cashOut });
  resumen.addRow({ concepto: "UTILIDAD NETA", valor: report.totals.netIncome });
  const lastRow = resumen.lastRow!;
  lastRow.font = { bold: true, color: { argb: "FFDC2626" } };
  lastRow.border = { top: { style: "thick" } };

  // Hoja Productos
  if (report.topProducts.length > 0) {
    const ws = wb.addWorksheet("Top Productos");
    ws.columns = [
      { header: "Producto", key: "name", width: 35 },
      { header: "Uds vendidas", key: "qty", width: 15 },
      { header: "Ingreso", key: "revenue", width: 15, style: { numFmt: moneyFmt } },
      { header: "Costo", key: "cost", width: 15, style: { numFmt: moneyFmt } },
      { header: "Utilidad", key: "profit", width: 15, style: { numFmt: moneyFmt } },
    ];
    ws.getRow(1).font = { bold: true };
    for (const p of report.topProducts) ws.addRow(p);
  }

  // Hoja Worst
  if (report.worstProducts.length > 0) {
    const ws = wb.addWorksheet("Menos Vendidos");
    ws.columns = [
      { header: "Producto", key: "name", width: 35 },
      { header: "Uds", key: "qty", width: 15 },
      { header: "Ingreso", key: "revenue", width: 15, style: { numFmt: moneyFmt } },
    ];
    ws.getRow(1).font = { bold: true };
    for (const p of report.worstProducts) ws.addRow(p);
  }

  // Hoja Categorías
  if (report.byCategory.length > 0) {
    const ws = wb.addWorksheet("Por Categoría");
    ws.columns = [
      { header: "Categoría", key: "name", width: 30 },
      { header: "Uds", key: "qty", width: 12 },
      { header: "Ingreso", key: "revenue", width: 18, style: { numFmt: moneyFmt } },
    ];
    ws.getRow(1).font = { bold: true };
    for (const c of report.byCategory) ws.addRow(c);
  }

  // Hoja Pagos
  if (report.byPayment.length > 0) {
    const ws = wb.addWorksheet("Métodos de Pago");
    ws.columns = [
      { header: "Método", key: "method", width: 20 },
      { header: "N° ventas", key: "count", width: 12 },
      { header: "Total", key: "total", width: 18, style: { numFmt: moneyFmt } },
    ];
    ws.getRow(1).font = { bold: true };
    for (const p of report.byPayment) {
      const methodLabel = p.method === "CASH" ? "Efectivo" : p.method === "CARD" ? "Tarjeta" : "Transferencia";
      ws.addRow({ ...p, method: methodLabel });
    }
  }

  // Hoja Gastos
  if (report.expensesByCategory.length > 0) {
    const ws = wb.addWorksheet("Gastos");
    ws.columns = [
      { header: "Categoría", key: "category", width: 30 },
      { header: "Monto", key: "amount", width: 18, style: { numFmt: moneyFmt } },
    ];
    ws.getRow(1).font = { bold: true };
    for (const e of report.expensesByCategory) ws.addRow(e);
  }

  // Hoja Diaria si aplica
  if (report.daily && report.daily.length > 0) {
    const ws = wb.addWorksheet("Diario");
    ws.columns = [
      { header: "Fecha", key: "date", width: 15 },
      { header: "Ventas", key: "sales", width: 10 },
      { header: "Ingreso", key: "revenue", width: 15, style: { numFmt: moneyFmt } },
      { header: "Gastos", key: "expenses", width: 15, style: { numFmt: moneyFmt } },
      { header: "Neto", key: "net", width: 15, style: { numFmt: moneyFmt } },
    ];
    ws.getRow(1).font = { bold: true };
    for (const d of report.daily) ws.addRow(d);
  }

  const ab = await wb.xlsx.writeBuffer();
  return Buffer.from(ab as ArrayBuffer);
}
