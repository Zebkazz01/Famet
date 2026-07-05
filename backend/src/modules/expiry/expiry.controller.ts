import { Request, Response } from "express";
import { prisma } from "../../config/database";
import { createBatchSchema, updateBatchSchema } from "./expiry.schema";
import * as expiryService from "./expiryService";

export async function expiring(req: Request, res: Response) {
  const days = Number(req.query.days) || 30;
  const items = await expiryService.getExpiring(days);
  return res.json(items);
}

export async function listBatches(req: Request, res: Response) {
  const productId = Number(req.params.id);
  const batches = await prisma.productBatch.findMany({
    where: { productId },
    orderBy: { expiryDate: "asc" },
  });
  const totalQty = await expiryService.totalBatchQty(productId);
  return res.json({ batches, totalQty });
}

export async function createBatch(req: Request, res: Response) {
  const productId = Number(req.params.id);
  const parsed = createBatchSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Datos inválidos", details: parsed.error.errors });
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) return res.status(404).json({ error: "Producto no encontrado" });

  // Activar hasBatches automáticamente al crear el primer lote
  const result = await prisma.$transaction(async (tx) => {
    const batch = await tx.productBatch.create({
      data: {
        productId,
        batchCode: parsed.data.batchCode ?? null,
        expiryDate: new Date(parsed.data.expiryDate),
        qty: parsed.data.qty,
        notes: parsed.data.notes ?? null,
      },
    });
    if (!product.hasBatches) {
      await tx.product.update({ where: { id: productId }, data: { hasBatches: true } });
    }
    // Sincronizar stockQty con total de lotes (si producto usa lotes)
    const totals = await tx.productBatch.aggregate({
      where: { productId },
      _sum: { qty: true },
    });
    await tx.product.update({
      where: { id: productId },
      data: { stockQty: totals._sum.qty || 0 },
    });
    return batch;
  });

  return res.status(201).json(result);
}

export async function updateBatch(req: Request, res: Response) {
  const id = Number(req.params.id);
  const parsed = updateBatchSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Datos inválidos", details: parsed.error.errors });
  const existing = await prisma.productBatch.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ error: "Lote no encontrado" });

  const data: any = {};
  if (parsed.data.batchCode !== undefined) data.batchCode = parsed.data.batchCode;
  if (parsed.data.expiryDate !== undefined) data.expiryDate = new Date(parsed.data.expiryDate);
  if (parsed.data.qty !== undefined) data.qty = parsed.data.qty;
  if (parsed.data.notes !== undefined) data.notes = parsed.data.notes;

  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.productBatch.update({ where: { id }, data });
    // Re-sync stockQty del producto
    const totals = await tx.productBatch.aggregate({
      where: { productId: existing.productId },
      _sum: { qty: true },
    });
    await tx.product.update({
      where: { id: existing.productId },
      data: { stockQty: totals._sum.qty || 0 },
    });
    return updated;
  });
  return res.json(result);
}

export async function deleteBatch(req: Request, res: Response) {
  const id = Number(req.params.id);
  const existing = await prisma.productBatch.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ error: "Lote no encontrado" });

  await prisma.$transaction(async (tx) => {
    await tx.productBatch.delete({ where: { id } });
    const totals = await tx.productBatch.aggregate({
      where: { productId: existing.productId },
      _sum: { qty: true },
    });
    await tx.product.update({
      where: { id: existing.productId },
      data: { stockQty: totals._sum.qty || 0 },
    });
    // Si no quedan lotes, desactivar hasBatches
    const remaining = await tx.productBatch.count({ where: { productId: existing.productId } });
    if (remaining === 0) {
      await tx.product.update({
        where: { id: existing.productId },
        data: { hasBatches: false },
      });
    }
  });
  return res.json({ message: "Lote eliminado" });
}
