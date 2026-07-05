import { Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../../config/database";
import {
  createOrderSchema,
  updateOrderSchema,
  receiveSchema,
} from "./purchaseOrders.schema";

function calcTotals(items: { quantityOrdered: number; unitCost: number }[], tax = 0) {
  const subtotal = items.reduce((s, i) => s + i.quantityOrdered * i.unitCost, 0);
  const total = subtotal + tax;
  return { subtotal, total };
}

async function nextCode(): Promise<string> {
  const last = await prisma.purchaseOrder.findFirst({ orderBy: { id: "desc" } });
  const n = (last?.id ?? 0) + 1;
  return `OC-${String(n).padStart(5, "0")}`;
}

export async function list(req: Request, res: Response) {
  const { status, supplierId, from, to } = req.query;
  const where: Prisma.PurchaseOrderWhereInput = {};
  if (status && typeof status === "string") where.status = status as any;
  if (supplierId) where.supplierId = Number(supplierId);
  if (from || to) {
    where.createdAt = {};
    if (from) (where.createdAt as any).gte = new Date(from as string);
    if (to) {
      const d = new Date(to as string);
      d.setHours(23, 59, 59, 999);
      (where.createdAt as any).lte = d;
    }
  }
  const orders = await prisma.purchaseOrder.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      supplier: { select: { id: true, name: true, nit: true } },
      _count: { select: { items: true } },
    },
    take: 200,
  });
  return res.json(orders);
}

export async function getOne(req: Request, res: Response) {
  const id = Number(req.params.id);
  const order = await prisma.purchaseOrder.findUnique({
    where: { id },
    include: {
      supplier: true,
      items: { include: { product: { select: { id: true, name: true, sku: true, weightUnit: true, saleType: true } } } },
    },
  });
  if (!order) return res.status(404).json({ error: "Orden no encontrada" });
  return res.json(order);
}

export async function create(req: Request, res: Response) {
  const parsed = createOrderSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Body inválido", details: parsed.error.errors });
  const userId = req.user!.userId;
  const { subtotal, total } = calcTotals(parsed.data.items, parsed.data.tax ?? 0);
  const code = await nextCode();

  const order = await prisma.purchaseOrder.create({
    data: {
      code,
      supplierId: parsed.data.supplierId,
      expectedDate: parsed.data.expectedDate ? new Date(parsed.data.expectedDate) : null,
      notes: parsed.data.notes ?? null,
      subtotal,
      tax: parsed.data.tax ?? 0,
      total,
      createdBy: userId,
      items: {
        create: parsed.data.items.map((it) => ({
          productId: it.productId,
          quantityOrdered: it.quantityOrdered,
          unitCost: it.unitCost,
          subtotal: it.quantityOrdered * it.unitCost,
          notes: it.notes ?? null,
        })),
      },
    },
    include: { items: true, supplier: true },
  });
  return res.status(201).json(order);
}

export async function update(req: Request, res: Response) {
  const id = Number(req.params.id);
  const parsed = updateOrderSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Body inválido", details: parsed.error.errors });

  const existing = await prisma.purchaseOrder.findUnique({ where: { id }, include: { items: true } });
  if (!existing) return res.status(404).json({ error: "Orden no encontrada" });
  if (existing.status === "RECEIVED" || existing.status === "CANCELLED") {
    return res.status(400).json({ error: "Orden cerrada — no se puede modificar" });
  }

  const data: Prisma.PurchaseOrderUpdateInput = {};
  if (parsed.data.expectedDate !== undefined) {
    data.expectedDate = parsed.data.expectedDate ? new Date(parsed.data.expectedDate) : null;
  }
  if (parsed.data.notes !== undefined) data.notes = parsed.data.notes;
  if (parsed.data.status) data.status = parsed.data.status;
  if (parsed.data.tax !== undefined) data.tax = parsed.data.tax;

  // Si vienen items, reemplaza todos (orden aún editable)
  if (parsed.data.items) {
    const { subtotal, total } = calcTotals(parsed.data.items, parsed.data.tax ?? Number(existing.tax));
    data.subtotal = subtotal;
    data.total = total;
    await prisma.purchaseOrderItem.deleteMany({ where: { orderId: id } });
    data.items = {
      create: parsed.data.items.map((it) => ({
        productId: it.productId,
        quantityOrdered: it.quantityOrdered,
        unitCost: it.unitCost,
        subtotal: it.quantityOrdered * it.unitCost,
        notes: it.notes ?? null,
      })),
    };
  }

  const updated = await prisma.purchaseOrder.update({ where: { id }, data, include: { items: true, supplier: true } });
  return res.json(updated);
}

/**
 * Recibir mercancía: registra qty recibida por item, genera InventoryMovement(ENTRY)
 * y actualiza stockQty + cost del producto. Si todo está recibido → status RECEIVED.
 * Si algo se recibió pero falta → PARTIAL.
 */
export async function receive(req: Request, res: Response) {
  const id = Number(req.params.id);
  const parsed = receiveSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Body inválido", details: parsed.error.errors });
  const userId = req.user!.userId;

  const order = await prisma.purchaseOrder.findUnique({
    where: { id },
    include: { items: true },
  });
  if (!order) return res.status(404).json({ error: "Orden no encontrada" });
  if (order.status === "RECEIVED" || order.status === "CANCELLED") {
    return res.status(400).json({ error: `Orden ya está ${order.status}` });
  }

  const updated = await prisma.$transaction(async (tx) => {
    for (const inc of parsed.data.items) {
      const item = order.items.find((it) => it.id === inc.itemId);
      if (!item) throw new Error(`Item ${inc.itemId} no pertenece a la orden`);
      if (inc.quantityReceived <= 0) continue;

      const newReceived = Number(item.quantityReceived) + inc.quantityReceived;
      if (newReceived > Number(item.quantityOrdered)) {
        throw new Error(`Item ${inc.itemId}: recibido supera ordenado`);
      }

      await tx.purchaseOrderItem.update({
        where: { id: item.id },
        data: { quantityReceived: newReceived },
      });

      // Actualiza stock del producto + costo (promedio ponderado simple)
      const product = await tx.product.findUnique({ where: { id: item.productId } });
      if (!product) continue;
      const prevStock = Number(product.stockQty);
      const prevCost = product.cost ? Number(product.cost) : 0;
      const newStock = prevStock + inc.quantityReceived;
      // Promedio ponderado: (prev * prevQty + nuevo * nuevaQty) / total
      const weightedCost = newStock > 0
        ? (prevCost * prevStock + Number(item.unitCost) * inc.quantityReceived) / newStock
        : Number(item.unitCost);

      await tx.product.update({
        where: { id: product.id },
        data: { stockQty: newStock, cost: weightedCost },
      });

      // Registra movimiento de inventario
      await tx.inventoryMovement.create({
        data: {
          productId: product.id,
          type: "ENTRY",
          quantity: inc.quantityReceived,
          previousQty: prevStock,
          newQty: newStock,
          unitCost: Number(item.unitCost),
          totalValue: Number(item.unitCost) * inc.quantityReceived,
          notes: `Recepción OC ${order.code}${parsed.data.notes ? " — " + parsed.data.notes : ""}`,
          userId,
        } as any,
      });
    }

    // Determinar nuevo status
    const refreshed = await tx.purchaseOrder.findUnique({ where: { id }, include: { items: true } });
    const allReceived = refreshed!.items.every((it) => Number(it.quantityReceived) >= Number(it.quantityOrdered));
    const anyReceived = refreshed!.items.some((it) => Number(it.quantityReceived) > 0);
    const newStatus = allReceived ? "RECEIVED" : anyReceived ? "PARTIAL" : order.status;

    return await tx.purchaseOrder.update({
      where: { id },
      data: {
        status: newStatus,
        receivedDate: allReceived ? new Date() : order.receivedDate,
        receivedBy: allReceived ? userId : order.receivedBy,
        attachment: parsed.data.attachment ?? order.attachment,
      },
      include: { items: true, supplier: true },
    });
  });

  return res.json(updated);
}

export async function cancel(req: Request, res: Response) {
  const id = Number(req.params.id);
  const order = await prisma.purchaseOrder.findUnique({ where: { id } });
  if (!order) return res.status(404).json({ error: "Orden no encontrada" });
  if (order.status === "RECEIVED") return res.status(400).json({ error: "Orden ya recibida — no se puede cancelar" });
  const updated = await prisma.purchaseOrder.update({
    where: { id },
    data: { status: "CANCELLED" },
  });
  return res.json(updated);
}
