import { Request, Response } from "express";
import { Decimal } from "@prisma/client/runtime/library";
import { prisma } from "../../config/database";
import { CreateSaleInput } from "./sales.schema";
import { AppError } from "../../middleware/errorHandler";

export async function createSale(req: Request, res: Response) {
  const input = req.body as CreateSaleInput;
  const userId = req.user!.userId;

  const sale = await prisma.$transaction(async (tx) => {
    // Calcular totales y validar stock
    let subtotal = new Decimal(0);

    for (const item of input.items) {
      const product = await tx.product.findUnique({ where: { id: item.productId } });
      if (!product || !product.active) {
        throw new AppError(400, `Producto ID ${item.productId} no disponible`);
      }

      const itemSubtotal = new Decimal(item.unitPrice).mul(item.quantity);
      subtotal = subtotal.add(itemSubtotal);

      // Verificar y descontar stock
      const newQty = product.stockQty.sub(new Decimal(item.quantity));
      if (product.saleType === "UNIT" && newQty.lessThan(0)) {
        throw new AppError(400, `Stock insuficiente para ${product.name}`);
      }

      await tx.product.update({
        where: { id: product.id },
        data: { stockQty: newQty },
      });

      // Registrar movimiento de inventario
      await tx.inventoryMovement.create({
        data: {
          productId: product.id,
          type: "SALE",
          quantity: new Decimal(item.quantity),
          previousQty: product.stockQty,
          newQty: newQty,
          notes: null,
        },
      });
    }

    const total = subtotal;
    const changeAmount = new Decimal(input.amountPaid).sub(total);

    if (changeAmount.lessThan(0)) {
      throw new AppError(400, "Monto pagado insuficiente");
    }

    // Crear venta
    const sale = await tx.sale.create({
      data: {
        userId,
        subtotal,
        total,
        paymentMethod: input.paymentMethod,
        amountPaid: input.amountPaid,
        changeAmount,
        items: {
          create: input.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            subtotal: new Decimal(item.unitPrice).mul(item.quantity),
          })),
        },
      },
      include: {
        items: { include: { product: true } },
        user: { select: { firstName: true, lastName: true } },
      },
    });

    return sale;
  });

  return res.status(201).json(sale);
}

export async function getSales(req: Request, res: Response) {
  const { from, to, limit } = req.query;

  const where: any = {};
  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt.gte = new Date(String(from));
    if (to) where.createdAt.lte = new Date(String(to) + "T23:59:59");
  }

  const sales = await prisma.sale.findMany({
    where,
    include: {
      user: { select: { firstName: true, lastName: true } },
      _count: { select: { items: true } },
    },
    orderBy: { createdAt: "desc" },
    take: limit ? Number(limit) : 50,
  });
  return res.json(sales);
}

export async function getSale(req: Request, res: Response) {
  const id = Number(req.params.id);
  const sale = await prisma.sale.findUnique({
    where: { id },
    include: {
      items: { include: { product: { include: { category: true } } } },
      user: { select: { firstName: true, lastName: true } },
    },
  });
  if (!sale) return res.status(404).json({ error: "Venta no encontrada" });
  return res.json(sale);
}

export async function getDailySummary(req: Request, res: Response) {
  const date = req.query.date ? String(req.query.date) : new Date().toISOString().split("T")[0];
  const startOfDay = new Date(date + "T00:00:00");
  const endOfDay = new Date(date + "T23:59:59");

  const sales = await prisma.sale.findMany({
    where: { createdAt: { gte: startOfDay, lte: endOfDay } },
    include: { items: { include: { product: true } } },
  });

  const totalSales = sales.length;
  const totalRevenue = sales.reduce((sum, s) => sum.add(s.total), new Decimal(0));

  // Productos más vendidos del día
  const productMap = new Map<number, { name: string; qty: Decimal; revenue: Decimal }>();
  for (const sale of sales) {
    for (const item of sale.items) {
      const existing = productMap.get(item.productId);
      if (existing) {
        existing.qty = existing.qty.add(item.quantity);
        existing.revenue = existing.revenue.add(item.subtotal);
      } else {
        productMap.set(item.productId, {
          name: item.product.name,
          qty: item.quantity,
          revenue: item.subtotal,
        });
      }
    }
  }

  const topProducts = Array.from(productMap.values())
    .sort((a, b) => b.revenue.sub(a.revenue).toNumber())
    .slice(0, 10);

  // Desglose por método de pago
  const byPayment = {
    CASH: sales.filter((s) => s.paymentMethod === "CASH").reduce((sum, s) => sum.add(s.total), new Decimal(0)),
    CARD: sales.filter((s) => s.paymentMethod === "CARD").reduce((sum, s) => sum.add(s.total), new Decimal(0)),
    TRANSFER: sales.filter((s) => s.paymentMethod === "TRANSFER").reduce((sum, s) => sum.add(s.total), new Decimal(0)),
  };

  return res.json({ date, totalSales, totalRevenue, topProducts, byPayment });
}
