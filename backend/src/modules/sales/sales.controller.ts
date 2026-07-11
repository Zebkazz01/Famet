import { Request, Response } from "express";
import { Decimal } from "@prisma/client/runtime/library";
import { prisma } from "../../config/database";
import { CreateSaleInput, CorrectSaleInput } from "./sales.schema";
import { AppError } from "../../middleware/errorHandler";
import * as expiryService from "../expiry/expiryService";
import { evaluate as evaluateDiscounts } from "../discounts/discountEngine";

/** Redondea un valor Decimal o number al peso colombiano más cercano (sin decimales) */
function roundPeso(val: Decimal | number): Decimal {
  const n = val instanceof Decimal ? val.toNumber() : val;
  return new Decimal(Math.round(n));
}

/** Redondea a múltiplo de 100 (Colombia no usa monedas menores a 100) */
function roundTo100(val: Decimal | number): Decimal {
  const n = val instanceof Decimal ? val.toNumber() : val;
  return new Decimal(Math.round(n / 100) * 100);
}

export async function createSale(req: Request, res: Response, next?: any) {
  try {
  const input = req.body as CreateSaleInput;
  const userId = req.user!.userId;

  const sale = await prisma.$transaction(async (tx) => {
    // Evaluar reglas de descuento solo para items que NO tienen skipDiscount=true
    const itemsForDiscount = input.items.filter((i) => !(i as any).skipDiscount);
    const productIds = [...new Set(itemsForDiscount.map((i) => i.productId))];
    const activeRules = productIds.length > 0
      ? await tx.productDiscountRule.findMany({
          where: { productId: { in: productIds }, active: true },
        })
      : [];
    const discountResult = activeRules.length > 0
      ? evaluateDiscounts(
          itemsForDiscount.map((i) => ({ productId: i.productId, quantity: i.quantity, unitPrice: i.unitPrice })),
          activeRules,
        )
      : { items: [], totalDiscount: 0, totalGross: 0, totalNet: 0 };
    const discountByProduct = new Map<number, { discount: number; ruleId: number | null }>();
    for (const d of discountResult.items) {
      discountByProduct.set(d.productId, { discount: d.discountAmount, ruleId: d.discountRuleId });
    }

    // Calcular totales y validar stock
    let subtotal = new Decimal(0);
    let discountTotal = new Decimal(0);

    for (const item of input.items) {
      const product = await tx.product.findUnique({ where: { id: item.productId } });
      if (!product || !product.active) {
        throw new AppError(400, `Producto ID ${item.productId} no disponible`);
      }

      const itemSubtotal = roundPeso(new Decimal(item.unitPrice).mul(item.quantity));
      const skipDiscount = !!(item as any).skipDiscount;
      const itemDiscount = skipDiscount ? new Decimal(0) : roundPeso(new Decimal(discountByProduct.get(item.productId)?.discount ?? 0));
      subtotal = subtotal.add(itemSubtotal.sub(itemDiscount));
      discountTotal = discountTotal.add(itemDiscount);

      // Calcular decremento de stock (sub-unidades = fracción del pack)
      let stockDecrement: Decimal;
      if (item.isSubUnit && product.unitsPerPack) {
        stockDecrement = new Decimal(item.quantity).div(product.unitsPerPack);
      } else {
        stockDecrement = new Decimal(item.quantity);
      }

      const newQty = product.stockQty.sub(stockDecrement);
      if (product.saleType === "UNIT" && newQty.lessThan(0)) {
        throw new AppError(400, `Stock insuficiente para ${product.name}`);
      }

      await tx.product.update({
        where: { id: product.id },
        data: { stockQty: newQty },
      });

      // FIFO de lotes si el producto tiene lotes activos
      if (product.hasBatches) {
        await expiryService.consumeFromBatches(tx, product.id, stockDecrement.toNumber());
      }

      // Registrar movimiento de inventario (con userId + valor)
      await tx.inventoryMovement.create({
        data: {
          productId: product.id,
          type: "SALE",
          quantity: stockDecrement,
          previousQty: product.stockQty,
          newQty: newQty,
          notes: item.isSubUnit ? `Sub-unidad: ${item.quantity} uds` : null,
          userId,
          unitCost: product.cost ?? null,
          totalValue: roundPeso(new Decimal(item.unitPrice).mul(item.quantity)),
        } as any,
      });
    }

    const total = roundTo100(subtotal);
    // Crédito: validar cliente y límite. Si crédito → amountPaid puede ser 0 y no exige cambio.
    const isCredit = !!(input as any).isCredit;
    const customerId = (input as any).customerId ?? null;
    let creditBalance = new Decimal(0);

    if (isCredit) {
      if (!customerId) throw new AppError(400, "Crédito requiere customerId");
      const customer = await tx.customer.findUnique({ where: { id: customerId } });
      if (!customer || !customer.active) throw new AppError(404, "Cliente no encontrado o inactivo");
      const partial = roundPeso(new Decimal(input.amountPaid || 0));
      creditBalance = total.sub(partial);
      if (creditBalance.lessThanOrEqualTo(0)) {
        // No es crédito real, se pagó todo
        creditBalance = new Decimal(0);
      }
      // Validar límite
      const newDebt = roundPeso(new Decimal(customer.currentDebt).add(creditBalance));
      if (Number(customer.creditLimit) > 0 && newDebt.greaterThan(customer.creditLimit)) {
        throw new AppError(400, `Excede límite de crédito (${customer.creditLimit}) — deuda total quedaría en ${newDebt.toFixed(0)}`);
      }
    }

    const changeAmount = isCredit
      ? new Decimal(0)
      : roundPeso(new Decimal(input.amountPaid).sub(total));

    if (!isCredit && changeAmount.lessThan(0)) {
      throw new AppError(400, "Monto pagado insuficiente");
    }

    // Crear venta
    const sale = await tx.sale.create({
      data: {
        userId,
        subtotal,
        total,
        discountTotal: roundPeso(discountTotal),
        paymentMethod: input.paymentMethod,
        amountPaid: roundPeso(new Decimal(input.amountPaid)),
        changeAmount,
        paymentRef: (input as any).paymentRef ?? null,
        paymentEvidence: (input as any).paymentEvidence ?? null,
        paymentStatus: (input as any).paymentStatus ?? "CONFIRMED",
        paymentNotes: (input as any).paymentNotes ?? null,
        isCredit,
        customerId,
        creditBalance: roundPeso(creditBalance),
        dueDate: (input as any).dueDate ? new Date((input as any).dueDate) : null,
        items: {
          create: input.items.map((item) => {
            const itemDiscount = discountByProduct.get(item.productId);
            const gross = new Decimal(item.unitPrice).mul(item.quantity);
            const disc = new Decimal(itemDiscount?.discount ?? 0);
            return {
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              subtotal: roundPeso(gross.sub(disc)),
              isSubUnit: item.isSubUnit || false,
              discountAmount: disc,
              discountRuleId: itemDiscount?.ruleId ?? null,
              originalPrice: disc.greaterThan(0) ? new Decimal(item.unitPrice) : null,
            };
          }),
        },
      },
      include: {
        items: { include: { product: true } },
        user: { select: { firstName: true, lastName: true } },
      },
    });

    // Vincular movements recientes a esta venta
    const movementProductIds = input.items.map((i) => i.productId);
    await tx.inventoryMovement.updateMany({
      where: {
        productId: { in: movementProductIds },
        type: "SALE",
        saleId: null,
        createdAt: { gte: new Date(Date.now() - 30000) },
      } as any,
      data: { saleId: sale.id } as any,
    });

    // Si fue crédito, aumentar deuda del cliente
    if (isCredit && customerId && creditBalance.greaterThan(0)) {
      await tx.customer.update({
        where: { id: customerId },
        data: { currentDebt: { increment: creditBalance } },
      });
    }

    return sale;
  });

  // Notificación de venta registrada (broadcast a ADMIN+SUPERVISOR)
  try {
    const notificationService = await import("../notifications/notificationService");
    const totalNum = Number((sale as any).total);
    // Una sola notificación broadcast (todos los usuarios). El backend filtra por usuario al listar.
    await notificationService.create({
      type: "SALE",
      title: "Venta registrada",
      message: `Venta #${sale.id} · ${input.items.length} producto(s) · $${totalNum.toLocaleString("es-CO")}`,
      link: `/sales?saleId=${sale.id}`,
      metadata: { saleId: sale.id, total: totalNum, userId: req.user?.userId } as any,
    });
  } catch {/* notif no debe romper la venta */}

  return res.status(201).json(sale);
  } catch (err: any) {
    if (next) return next(err);
    return res.status(err.status || 500).json({ error: err.message || "Error al crear venta" });
  }
}

function parseDateParam(value: string, endOfDay: boolean): Date {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split("-").map(Number);
    if (endOfDay) return new Date(y, m - 1, d, 23, 59, 59, 999);
    return new Date(y, m - 1, d);
  }
  return new Date(value);
}

export async function getSales(req: Request, res: Response) {
  const { from, to, limit } = req.query;

  const where: any = {};
  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt.gte = parseDateParam(String(from), false);
    if (to) where.createdAt.lte = parseDateParam(String(to), true);
  }

  // VENDEDOR solo ve sus propias ventas
  if (req.user!.role === "VENDEDOR") {
    where.userId = req.user!.userId;
  }

  const sales = await prisma.sale.findMany({
    where,
    include: {
      user: { select: { firstName: true, lastName: true } },
      customer: { select: { id: true, name: true } },
      items: { select: { product: { select: { name: true } } } },
      _count: { select: { items: true } },
    },
    orderBy: { createdAt: "desc" },
    take: limit ? Number(limit) : 50,
  });

  const result = sales.map((sale) => ({
    ...sale,
    productNames: [...new Set(sale.items.map((i: any) => i.product.name))].join(", "),
  }));
  return res.json(result);
}

export async function getSale(req: Request, res: Response) {
  const id = Number(req.params.id);
  const sale = await prisma.sale.findUnique({
    where: { id },
    include: {
      items: { include: { product: { include: { category: true } } } },
      user: { select: { firstName: true, lastName: true } },
      customer: { select: { id: true, name: true, currentDebt: true } },
    },
  });
  if (!sale) return res.status(404).json({ error: "Venta no encontrada" });
  return res.json(sale);
}

export async function getDailySummary(req: Request, res: Response) {
  const date = req.query.date ? String(req.query.date) : new Date().toISOString().split("T")[0];
  const startOfDay = parseDateParam(date, false);
  const endOfDay = parseDateParam(date, true);

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

export async function correctSale(req: Request, res: Response) {
  const id = Number(req.params.id);
  const { correctionReason } = req.body as CorrectSaleInput;
  const userId = req.user!.userId;
  const userRole = req.user!.role;

  const sale = await prisma.sale.findUnique({ where: { id } });
  if (!sale) return res.status(404).json({ error: "Venta no encontrada" });

  // VENDEDOR solo puede corregir sus propias ventas
  if (userRole === "VENDEDOR" && sale.userId !== userId) {
    return res.status(403).json({ error: "Solo puedes corregir tus propias ventas" });
  }

  const updated = await prisma.sale.update({
    where: { id },
    data: {
      corrected: true,
      correctionReason,
      correctedBy: userId,
      correctedAt: new Date(),
    },
    include: {
      user: { select: { firstName: true, lastName: true } },
      items: { include: { product: true } },
    },
  });

  try {
    const notificationService = await import("../notifications/notificationService");
    await notificationService.create({
      type: "WARNING",
      role: "ADMIN",
      title: "Venta corregida",
      message: `Venta #${id} marcada como corregida: ${correctionReason}`,
      link: `/sales?saleId=${id}`,
      metadata: { saleId: id, correctedBy: userId } as any,
    });
  } catch {/* nop */}

  return res.json(updated);
}

export async function deleteSale(req: Request, res: Response) {
  const id = Number(req.params.id);
  const userId = req.user!.userId;

  const existing = await prisma.sale.findUnique({
    where: { id },
    include: { items: { include: { product: true } } },
  });
  if (!existing) return res.status(404).json({ error: "Venta no encontrada" });

  await prisma.$transaction(async (tx) => {
    if (!existing.corrected) {
      // Venta activa: restaurar stock y registrar devolución
      for (const item of existing.items) {
        const product = await tx.product.findUnique({ where: { id: item.productId } });
        if (!product) continue;
        let stockReturn: Decimal;
        if (item.isSubUnit && product.unitsPerPack) {
          stockReturn = item.quantity.div(product.unitsPerPack);
        } else {
          stockReturn = item.quantity;
        }
        const restoredQty = product.stockQty.add(stockReturn);
        await tx.product.update({ where: { id: product.id }, data: { stockQty: restoredQty } });
        await tx.inventoryMovement.create({
          data: {
            productId: product.id, type: "RETURN", quantity: stockReturn,
            previousQty: product.stockQty, newQty: restoredQty,
            notes: `Eliminación venta #${id}`,
          },
        });
      }
      if (existing.paymentMethod === "CASH" && Number(existing.total) > 0) {
        await tx.cashMovement.create({
          data: {
            type: "CASH_OUT",
            amount: roundPeso(existing.total),
            reason: `Devolución venta #${id}: Eliminada por administrador`,
            userId,
          },
        });
      }
    }

    await tx.saleItem.deleteMany({ where: { saleId: id } });
    await tx.sale.delete({ where: { id } });
  });

  try {
    const notificationService = await import("../notifications/notificationService");
    await notificationService.create({
      type: "WARNING",
      role: "ADMIN",
      title: "Venta eliminada",
      message: `Venta #${id} fue eliminada por administrador`,
      link: `/sales`,
      metadata: { saleId: id, deletedBy: userId } as any,
    });
  } catch {/* nop */}

  return res.json({ message: "Venta eliminada exitosamente" });
}

export async function updateSale(req: Request, res: Response) {
  const id = Number(req.params.id);
  const input = req.body as CreateSaleInput & { correctionReason?: string };
  const userId = req.user!.userId;

  const existing = await prisma.sale.findUnique({
    where: { id },
    include: { items: { include: { product: true } } },
  });
  if (!existing) return res.status(404).json({ error: "Venta no encontrada" });

  const sale = await prisma.$transaction(async (tx) => {
    // 1. Devolver stock de items originales
    for (const item of existing.items) {
      const product = await tx.product.findUnique({ where: { id: item.productId } });
      if (!product) continue;
      let stockReturn: Decimal;
      if (item.isSubUnit && product.unitsPerPack) {
        stockReturn = item.quantity.div(product.unitsPerPack);
      } else {
        stockReturn = item.quantity;
      }
      const restoredQty = product.stockQty.add(stockReturn);
      await tx.product.update({ where: { id: product.id }, data: { stockQty: restoredQty } });
      await tx.inventoryMovement.create({
        data: {
          productId: product.id, type: "RETURN", quantity: stockReturn,
          previousQty: product.stockQty, newQty: restoredQty,
          notes: `Edicion venta #${id}`,
        },
      });
    }

    // 2. Borrar items viejos
    await tx.saleItem.deleteMany({ where: { saleId: id } });

    // 3. Calcular nuevos totales y descontar stock
    let subtotal = new Decimal(0);
    for (const item of input.items) {
      const product = await tx.product.findUnique({ where: { id: item.productId } });
      if (!product || !product.active) {
        throw new AppError(400, `Producto ID ${item.productId} no disponible`);
      }
      const itemSubtotal = roundPeso(new Decimal(item.unitPrice).mul(item.quantity));
      subtotal = subtotal.add(itemSubtotal);

      let stockDecrement: Decimal;
      if (item.isSubUnit && product.unitsPerPack) {
        stockDecrement = new Decimal(item.quantity).div(product.unitsPerPack);
      } else {
        stockDecrement = new Decimal(item.quantity);
      }
      const newQty = product.stockQty.sub(stockDecrement);
      if (product.saleType === "UNIT" && newQty.lessThan(0)) {
        throw new AppError(400, `Stock insuficiente para ${product.name}`);
      }
      await tx.product.update({ where: { id: product.id }, data: { stockQty: newQty } });
      await tx.inventoryMovement.create({
        data: {
          productId: product.id, type: "SALE", quantity: stockDecrement,
          previousQty: product.stockQty, newQty,
          notes: `Edicion venta #${id}`,
        },
      });
    }

    // 4. Si quedó sin items → registrar devolución total como CashMovement (si fue en efectivo)
    const isFullRefund = input.items.length === 0;
    if (isFullRefund && existing.paymentMethod === "CASH" && Number(existing.total) > 0) {
      await tx.cashMovement.create({
        data: {
          type: "CASH_OUT",
          amount: existing.total,
          reason: `Devolución total venta #${id}: ${input.correctionReason || "Anulada"}`,
          userId,
        },
      });
    }

    // 5. Actualizar venta
    const total = roundTo100(subtotal);
    const updated = await tx.sale.update({
      where: { id },
      data: {
        subtotal, total,
        amountPaid: total,
        changeAmount: 0,
        corrected: true,
        correctionReason: input.correctionReason || (isFullRefund ? "Anulación con devolución total" : "Edición de venta"),
        correctedBy: userId,
        correctedAt: new Date(),
        items: {
          create: input.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            subtotal: roundPeso(new Decimal(item.unitPrice).mul(item.quantity)),
            isSubUnit: item.isSubUnit || false,
          })),
        },
      },
      include: {
        items: { include: { product: true } },
        user: { select: { firstName: true, lastName: true } },
      },
    });
    return updated;
  });

  return res.json(sale);
}
