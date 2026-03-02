import PDFDocument from "pdfkit";
import { prisma } from "../config/database";

interface SaleForPdf {
  id: number;
  createdAt: Date;
  total: any;
  subtotal: any;
  paymentMethod: string;
  amountPaid: any;
  changeAmount: any;
  user: { name: string };
  items: Array<{
    quantity: any;
    unitPrice: any;
    subtotal: any;
    product: { name: string; saleType: string };
  }>;
}

export async function generateTicketPdf(sale: SaleForPdf): Promise<Buffer> {
  const config = await prisma.systemConfig.findMany();
  const getConfig = (key: string) => config.find((c) => c.key === key)?.value || "";

  const businessName = getConfig("business_name") || "FAMEAT";
  const businessAddress = getConfig("business_address");
  const businessPhone = getConfig("business_phone");

  return new Promise((resolve, reject) => {
    // Ticket térmico: 80mm ~= 226 pts
    const doc = new PDFDocument({
      size: [226, 600],
      margins: { top: 10, bottom: 10, left: 10, right: 10 },
    });

    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const w = 206; // ancho útil

    // Encabezado
    doc.fontSize(14).font("Helvetica-Bold").text(businessName, { align: "center" });
    if (businessAddress) doc.fontSize(7).font("Helvetica").text(businessAddress, { align: "center" });
    if (businessPhone) doc.fontSize(7).text(`Tel: ${businessPhone}`, { align: "center" });

    doc.moveDown(0.3);
    doc.fontSize(8).text("─".repeat(38), { align: "center" });

    // Info venta
    const date = new Date(sale.createdAt);
    doc.fontSize(8).text(`Ticket #${sale.id}`);
    doc.text(`Fecha: ${date.toLocaleDateString("es-MX")} ${date.toLocaleTimeString("es-MX")}`);
    doc.text(`Atendió: ${sale.user.name}`);

    doc.text("─".repeat(38), { align: "center" });

    // Items
    for (const item of sale.items) {
      const qty = Number(item.quantity);
      const unit = item.product.saleType === "WEIGHT" ? "kg" : "uds";
      const name = item.product.name.substring(0, 20);
      const sub = Number(item.subtotal).toFixed(2);

      doc.text(`${name}`);
      doc.text(`  ${qty.toFixed(3)} ${unit} x $${Number(item.unitPrice).toFixed(2)} = $${sub}`);
    }

    doc.text("─".repeat(38), { align: "center" });

    // Totales
    doc.font("Helvetica-Bold");
    doc.text(`TOTAL: $${Number(sale.total).toFixed(2)}`, { align: "right" });
    doc.font("Helvetica");

    const methodNames: Record<string, string> = {
      CASH: "Efectivo",
      CARD: "Tarjeta",
      TRANSFER: "Transferencia",
    };
    doc.text(`Pago: ${methodNames[sale.paymentMethod] || sale.paymentMethod}`, { align: "right" });
    doc.text(`Pagado: $${Number(sale.amountPaid).toFixed(2)}`, { align: "right" });
    if (Number(sale.changeAmount) > 0) {
      doc.text(`Cambio: $${Number(sale.changeAmount).toFixed(2)}`, { align: "right" });
    }

    doc.moveDown(0.5);
    doc.fontSize(8).text("¡Gracias por su compra!", { align: "center" });

    doc.end();
  });
}
