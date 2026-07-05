import PDFDocument from "pdfkit";
import path from "path";
import fs from "fs";
import * as configCache from "../../utils/configCache";
import { FinancialReport } from "./financialBuilder";

const CURRENCY = (n: number) => `$${n.toLocaleString("es-CO", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

function header(doc: PDFKit.PDFDocument, title: string, subtitle: string): void {
  const businessName = configCache.get("business_name") || "POS";
  const businessLogo = configCache.get("business_logo");

  // Logo
  if (businessLogo) {
    try {
      const rel = businessLogo.replace(/^\//, "");
      const abs = path.join(process.cwd(), rel);
      if (fs.existsSync(abs)) {
        doc.image(abs, doc.page.margins.left, doc.y, { width: 50 });
      }
    } catch {}
  }
  doc.fontSize(18).font("Helvetica-Bold").text(title, { align: "right" });
  doc.fontSize(10).font("Helvetica").fillColor("#666666").text(businessName, { align: "right" });
  doc.fontSize(9).text(subtitle, { align: "right" });
  doc.fontSize(8).fillColor("#aaaaaa").text(`Generado: ${new Date().toLocaleString("es-CO")}`, { align: "right" });
  doc.moveDown(1);
  doc.strokeColor("#dddddd").lineWidth(0.5).moveTo(doc.page.margins.left, doc.y).lineTo(doc.page.width - doc.page.margins.right, doc.y).stroke();
  doc.moveDown(0.8);
  doc.fillColor("#000000");
}

function section(doc: PDFKit.PDFDocument, title: string): void {
  doc.moveDown(0.5);
  doc.fontSize(11).font("Helvetica-Bold").fillColor("#dc2626").text(title);
  doc.fillColor("#000000").moveDown(0.3);
}

function kvLine(doc: PDFKit.PDFDocument, label: string, value: string, bold = false): void {
  const startX = doc.x;
  doc.fontSize(10).font(bold ? "Helvetica-Bold" : "Helvetica");
  doc.text(label, { continued: true, width: 300 });
  doc.text(value, { align: "right" });
  doc.x = startX;
}

function table(doc: PDFKit.PDFDocument, headers: string[], rows: (string | number)[][], widths: number[]): void {
  const startX = doc.x;
  const lineHeight = 16;
  // Header
  doc.fontSize(9).font("Helvetica-Bold").fillColor("#666666");
  let x = startX;
  for (let i = 0; i < headers.length; i++) {
    doc.text(headers[i], x, doc.y, { width: widths[i], continued: i < headers.length - 1 });
    x += widths[i];
  }
  doc.fillColor("#000000").moveDown(0.3);
  doc.strokeColor("#eeeeee").lineWidth(0.5).moveTo(startX, doc.y).lineTo(startX + widths.reduce((a, b) => a + b, 0), doc.y).stroke();
  doc.moveDown(0.2);
  // Rows
  doc.font("Helvetica").fontSize(9);
  for (const row of rows) {
    if (doc.y + lineHeight > doc.page.height - doc.page.margins.bottom) {
      doc.addPage();
    }
    x = startX;
    for (let i = 0; i < row.length; i++) {
      doc.text(String(row[i]), x, doc.y, { width: widths[i], continued: i < row.length - 1 });
      x += widths[i];
    }
    doc.moveDown(0.3);
  }
}

export interface InventoryRow {
  name: string;
  category: string;
  supplier: string;
  stockQty: number;
  minStock: number;
  price: number;
  cost: number;
  stockValue: number;
}

export function renderInventoryPdf(items: InventoryRow[], totalValue: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: "LETTER", layout: "landscape", margin: 36 });
      const chunks: Buffer[] = [];
      doc.on("data", (c) => chunks.push(c));
      doc.on("end", () => resolve(Buffer.concat(chunks as unknown as Uint8Array[])));
      doc.on("error", reject);

      header(doc, "Reporte de Inventario", `${items.length} producto(s) activos`);

      section(doc, "Resumen");
      kvLine(doc, "Productos activos", String(items.length));
      kvLine(doc, "Stock total (unidades)", items.reduce((s, x) => s + x.stockQty, 0).toFixed(2));
      kvLine(doc, "Productos con stock crítico (< mín)", String(items.filter((x) => x.stockQty < x.minStock).length));
      doc.moveDown(0.3);
      doc.strokeColor("#dc2626").lineWidth(1).moveTo(doc.x, doc.y).lineTo(doc.page.width - doc.page.margins.right, doc.y).stroke();
      doc.moveDown(0.3);
      kvLine(doc, "VALOR TOTAL DEL INVENTARIO", CURRENCY(totalValue), true);

      section(doc, "Detalle de productos");
      table(doc,
        ["Producto", "Categoría", "Proveedor", "Stock", "Mín", "Precio", "Costo", "Valor"],
        items.map((p) => [
          p.name,
          p.category,
          p.supplier,
          p.stockQty.toFixed(2),
          p.minStock.toFixed(0),
          CURRENCY(p.price),
          CURRENCY(p.cost),
          CURRENCY(p.stockValue),
        ]),
        [180, 110, 110, 50, 40, 75, 75, 90],
      );

      doc.end();
    } catch (e) {
      reject(e);
    }
  });
}

export function renderFinancialPdf(report: FinancialReport, title = "Estado de Resultados"): Buffer {
  const doc = new PDFDocument({ size: "LETTER", layout: "landscape", margin: 36 });
  const chunks: Buffer[] = [];
  doc.on("data", (c) => chunks.push(c));
  const fromFmt = new Date(report.range.from).toLocaleDateString("es-CO");
  const toFmt = new Date(report.range.to).toLocaleDateString("es-CO");
  header(doc, title, `${fromFmt} a ${toFmt}`);

  // Resumen
  section(doc, "Resumen");
  kvLine(doc, "Ventas totales", String(report.totals.salesCount));
  kvLine(doc, "Ingresos brutos", CURRENCY(report.totals.grossRevenue));
  kvLine(doc, "Descuentos aplicados", `- ${CURRENCY(report.totals.discountTotal)}`);
  kvLine(doc, "Ingresos netos", CURRENCY(report.totals.netRevenue), true);
  kvLine(doc, "Costo de productos vendidos", `- ${CURRENCY(report.totals.totalCost)}`);
  kvLine(doc, "Utilidad bruta", CURRENCY(report.totals.grossProfit), true);
  kvLine(doc, "Gastos operativos", `- ${CURRENCY(report.totals.expensesTotal)}`);
  doc.moveDown(0.3);
  doc.strokeColor("#dc2626").lineWidth(1).moveTo(doc.x, doc.y).lineTo(doc.page.width - doc.page.margins.right, doc.y).stroke();
  doc.moveDown(0.3);
  kvLine(doc, "UTILIDAD NETA", CURRENCY(report.totals.netIncome), true);

  // Caja
  section(doc, "Movimientos de caja");
  kvLine(doc, "Entradas (cash in)", CURRENCY(report.totals.cashIn));
  kvLine(doc, "Salidas (cash out)", `- ${CURRENCY(report.totals.cashOut)}`);

  // Productos top
  if (report.topProducts.length > 0) {
    section(doc, "Top 10 productos por ingreso");
    table(doc,
      ["Producto", "Uds", "Ingreso", "Costo", "Utilidad"],
      report.topProducts.map((p) => [p.name, p.qty.toFixed(2), CURRENCY(p.revenue), CURRENCY(p.cost), CURRENCY(p.profit)]),
      [280, 60, 110, 110, 110],
    );
  }

  // Por categoría
  if (report.byCategory.length > 0) {
    section(doc, "Ventas por categoría");
    table(doc,
      ["Categoría", "Uds", "Ingreso"],
      report.byCategory.map((c) => [c.name, c.qty.toFixed(2), CURRENCY(c.revenue)]),
      [400, 120, 150],
    );
  }

  // Pagos
  if (report.byPayment.length > 0) {
    section(doc, "Ventas por método de pago");
    table(doc,
      ["Método", "Ventas", "Total"],
      report.byPayment.map((p) => [
        p.method === "CASH" ? "Efectivo" : p.method === "CARD" ? "Tarjeta" : "Transferencia",
        String(p.count),
        CURRENCY(p.total),
      ]),
      [280, 120, 270],
    );
  }

  // Gastos por categoría
  if (report.expensesByCategory.length > 0) {
    section(doc, "Gastos por categoría");
    table(doc,
      ["Categoría", "Monto"],
      report.expensesByCategory.map((e) => [e.category, CURRENCY(e.amount)]),
      [500, 180],
    );
  }

  doc.end();
  return Buffer.concat(chunks as unknown as Uint8Array[]);
}

export function renderFinancialPdfAsync(report: FinancialReport, title?: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: "LETTER", layout: "landscape", margin: 36 });
      const chunks: Buffer[] = [];
      doc.on("data", (c) => chunks.push(c));
      doc.on("end", () => resolve(Buffer.concat(chunks as unknown as Uint8Array[])));
      doc.on("error", reject);

      const fromFmt = new Date(report.range.from).toLocaleDateString("es-CO");
      const toFmt = new Date(report.range.to).toLocaleDateString("es-CO");
      header(doc, title || "Estado de Resultados", `${fromFmt} → ${toFmt}`);

      section(doc, "Resumen");
      kvLine(doc, "Ventas totales", String(report.totals.salesCount));
      kvLine(doc, "Ingresos brutos", CURRENCY(report.totals.grossRevenue));
      kvLine(doc, "Descuentos aplicados", `- ${CURRENCY(report.totals.discountTotal)}`);
      kvLine(doc, "Ingresos netos", CURRENCY(report.totals.netRevenue), true);
      kvLine(doc, "Costo de productos vendidos", `- ${CURRENCY(report.totals.totalCost)}`);
      kvLine(doc, "Utilidad bruta", CURRENCY(report.totals.grossProfit), true);
      kvLine(doc, "Gastos operativos", `- ${CURRENCY(report.totals.expensesTotal)}`);
      doc.moveDown(0.3);
      doc.strokeColor("#dc2626").lineWidth(1).moveTo(doc.x, doc.y).lineTo(doc.page.width - doc.page.margins.right, doc.y).stroke();
      doc.moveDown(0.3);
      kvLine(doc, "UTILIDAD NETA", CURRENCY(report.totals.netIncome), true);

      section(doc, "Movimientos de caja");
      kvLine(doc, "Entradas (cash in)", CURRENCY(report.totals.cashIn));
      kvLine(doc, "Salidas (cash out)", `- ${CURRENCY(report.totals.cashOut)}`);

      if (report.topProducts.length > 0) {
        section(doc, "Top 10 productos por ingreso");
        table(doc,
          ["Producto", "Uds", "Ingreso", "Costo", "Utilidad"],
          report.topProducts.map((p) => [p.name, p.qty.toFixed(2), CURRENCY(p.revenue), CURRENCY(p.cost), CURRENCY(p.profit)]),
          [220, 50, 80, 80, 80],
        );
      }

      if (report.byCategory.length > 0) {
        section(doc, "Ventas por categoría");
        table(doc,
          ["Categoría", "Uds", "Ingreso"],
          report.byCategory.map((c) => [c.name, c.qty.toFixed(2), CURRENCY(c.revenue)]),
          [300, 80, 130],
        );
      }

      if (report.byPayment.length > 0) {
        section(doc, "Ventas por método de pago");
        table(doc,
          ["Método", "Ventas", "Total"],
          report.byPayment.map((p) => [
            p.method === "CASH" ? "Efectivo" : p.method === "CARD" ? "Tarjeta" : "Transferencia",
            String(p.count),
            CURRENCY(p.total),
          ]),
          [200, 100, 200],
        );
      }

      if (report.expensesByCategory.length > 0) {
        section(doc, "Gastos por categoría");
        table(doc,
          ["Categoría", "Monto"],
          report.expensesByCategory.map((e) => [e.category, CURRENCY(e.amount)]),
          [400, 100],
        );
      }

      doc.end();
    } catch (e) {
      reject(e);
    }
  });
}
