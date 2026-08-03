import { Request, Response } from "express";
import { prisma } from "../../config/database";
import { AppError } from "../../middleware/errorHandler";
import { createProcessingSchema, updateProcessingSchema } from "./processing.schema";
import type { Prisma } from "@prisma/client";

const batchInclude = {
  outputs: {
    include: {
      product: { select: { id: true, name: true, sku: true, stockQty: true, cost: true, price: true, saleType: true } },
    },
  },
  inputProduct: { select: { id: true, name: true, stockQty: true } },
  processor: { select: { id: true, firstName: true, lastName: true } },
} satisfies Prisma.ProcessingBatchInclude;

function generateCode(): string {
  return `PR-${String(Date.now()).slice(-5)}${String(Math.floor(Math.random() * 100)).padStart(2, "0")}`;
}

export async function create(req: Request, res: Response) {
  const data = createProcessingSchema.parse(req.body);
  const userId = req.user!.userId;

  const batch = await prisma.$transaction(async (tx) => {
    const code = generateCode();
    const outputs = data.outputs.map((o) => ({
      productId: o.productId,
      weightKg: o.weightKg,
      costPerKg: o.costPerKg ?? 0,
      totalCost: o.costPerKg ? +(o.costPerKg * o.weightKg).toFixed(2) : 0,
      salePricePerKg: o.salePricePerKg ?? null,
    }));

    return tx.processingBatch.create({
      data: {
        code,
        animalType: data.animalType as any,
        inputProductId: data.inputProductId,
        inputWeightKg: data.inputWeightKg,
        totalCost: data.totalCost,
        wasteWeightKg: data.wasteWeightKg ?? 0,
        notes: data.notes,
        processedBy: userId,
        status: "DRAFT",
        outputs: { createMany: { data: outputs } },
      },
      include: batchInclude,
    });
  });

  return res.status(201).json(batch);
}

export async function list(req: Request, res: Response) {
  const { status, animalType } = req.query;
  const where: any = {};
  if (status) where.status = status;
  if (animalType) where.animalType = String(animalType).toUpperCase();

  const rows = await prisma.processingBatch.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      outputs: { select: { weightKg: true, totalCost: true, productId: true } },
      inputProduct: { select: { id: true, name: true } },
      processor: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  const result = rows.map((r) => ({
    ...r,
    totalOutputWeight: r.outputs.reduce((s, o) => s + Number(o.weightKg), 0),
    totalAssignedCost: r.outputs.reduce((s, o) => s + Number(o.totalCost), 0),
  }));

  return res.json(result);
}

export async function getOne(req: Request, res: Response) {
  const id = Number(req.params.id);
  const batch = await prisma.processingBatch.findUnique({
    where: { id },
    include: batchInclude,
  });
  if (!batch) throw new AppError(404, "Proceso no encontrado");
  return res.json(batch);
}

export async function update(req: Request, res: Response) {
  const id = Number(req.params.id);
  const data = updateProcessingSchema.parse(req.body);

  const existing = await prisma.processingBatch.findUnique({ where: { id } });
  if (!existing) throw new AppError(404, "Proceso no encontrado");
  if (existing.status === "COMPLETED") throw new AppError(400, "Para editar un proceso completado, reviértalo a borrador primero");
  if (existing.status !== "DRAFT") throw new AppError(400, "Solo se puede editar un proceso en borrador");

  const batch = await prisma.$transaction(async (tx) => {
    if (data.outputs) {
      await tx.processingOutput.deleteMany({ where: { batchId: id } });
      const outputs = data.outputs.map((o) => ({
        batchId: id,
        productId: o.productId,
        weightKg: o.weightKg,
        costPerKg: o.costPerKg ?? 0,
        totalCost: o.costPerKg ? +(o.costPerKg * o.weightKg).toFixed(2) : 0,
        salePricePerKg: o.salePricePerKg ?? null,
      }));
      await tx.processingOutput.createMany({ data: outputs });
    }

    return tx.processingBatch.update({
      where: { id },
      data: {
        animalType: data.animalType as any,
        inputWeightKg: data.inputWeightKg,
        totalCost: data.totalCost,
        wasteWeightKg: data.wasteWeightKg,
        notes: data.notes,
      },
      include: batchInclude,
    });
  });

  return res.json(batch);
}

export async function complete(req: Request, res: Response) {
  const id = Number(req.params.id);
  const userId = req.user!.userId;

  const batch = await prisma.processingBatch.findUnique({
    where: { id },
    include: { outputs: true },
  });
  if (!batch) throw new AppError(404, "Proceso no encontrado");
  if (batch.status !== "DRAFT") throw new AppError(400, "Solo se puede finalizar un proceso en borrador");
  if (batch.outputs.length === 0) throw new AppError(400, "Debe tener al menos 1 corte");

  const result = await prisma.$transaction(async (tx) => {
    const outputWeight = batch.outputs.reduce((s, o) => s + Number(o.weightKg), 0);
    const uniformCostKg = +(Number(batch.totalCost) / outputWeight).toFixed(2);
    let remainingCost = Number(batch.totalCost);

    for (let i = 0; i < batch.outputs.length; i++) {
      const output = batch.outputs[i];
      const weight = Number(output.weightKg);
      const isLast = i === batch.outputs.length - 1;

      let totalCost: number;
      if (isLast) {
        totalCost = +remainingCost.toFixed(2);
      } else {
        totalCost = +(uniformCostKg * weight).toFixed(2);
      }
      remainingCost -= totalCost;
      const costPerKg = weight > 0 ? +(totalCost / weight).toFixed(2) : 0;

      await tx.processingOutput.update({
        where: { id: output.id },
        data: { costPerKg, totalCost },
      });

      const prod = await tx.product.findUnique({ where: { id: output.productId } });
      if (!prod) throw new AppError(404, `Producto ${output.productId} no encontrado`);

      const prevStock = Number(prod.stockQty);
      const prevCost = Number(prod.cost ?? 0);
      const newStock = +(prevStock + weight).toFixed(3);
      const newCost = newStock > 0
        ? +((prevCost * prevStock + totalCost) / newStock).toFixed(2)
        : +costPerKg.toFixed(2);

      await tx.product.update({
        where: { id: output.productId },
        data: { stockQty: newStock, cost: newCost },
      });

      await tx.inventoryMovement.create({
        data: {
          productId: output.productId,
          type: "PROCESSING_OUTPUT",
          quantity: weight,
          previousQty: prevStock,
          newQty: newStock,
          unitCost: +costPerKg.toFixed(2),
          totalValue: +totalCost.toFixed(2),
          notes: `Procesamiento ${batch.code}: ${batch.animalType}`,
          userId,
        },
      });
    }

    const inputProd = await tx.product.findUnique({ where: { id: batch.inputProductId } });
    if (inputProd) {
      const prevInputStock = Number(inputProd.stockQty);
      const newInputStock = +(prevInputStock - Number(batch.inputWeightKg)).toFixed(3);
      await tx.product.update({
        where: { id: batch.inputProductId },
        data: { stockQty: Math.max(0, newInputStock) },
      });
      await tx.inventoryMovement.create({
        data: {
          productId: batch.inputProductId,
          type: "PROCESSING_INPUT",
          quantity: Number(batch.inputWeightKg),
          previousQty: prevInputStock,
          newQty: Math.max(0, newInputStock),
          unitCost: Number(batch.inputWeightKg) > 0
            ? +(Number(batch.totalCost) / Number(batch.inputWeightKg)).toFixed(2)
            : 0,
          totalValue: Number(batch.totalCost),
          notes: `Procesamiento ${batch.code}: consumido para desposte`,
          userId,
        },
      });
    }

    return tx.processingBatch.update({
      where: { id },
      data: { status: "COMPLETED", completedAt: new Date() },
      include: batchInclude,
    });
  });

  return res.json(result);
}

export async function cancel(req: Request, res: Response) {
  const id = Number(req.params.id);
  const batch = await prisma.processingBatch.findUnique({ where: { id } });
  if (!batch) throw new AppError(404, "Proceso no encontrado");
  if (batch.status !== "DRAFT") throw new AppError(400, "Solo se puede cancelar un borrador");

  const updated = await prisma.processingBatch.update({
    where: { id },
    data: { status: "CANCELLED" },
  });
  return res.json(updated);
}

export async function revert(req: Request, res: Response) {
  const id = Number(req.params.id);
  const userId = req.user!.userId;

  const batch = await prisma.processingBatch.findUnique({
    where: { id },
    include: { outputs: true },
  });
  if (!batch) throw new AppError(404, "Proceso no encontrado");
  if (batch.status !== "COMPLETED") throw new AppError(400, "Solo se puede revertir un proceso completado");

  const result = await prisma.$transaction(async (tx) => {
    for (const output of batch.outputs) {
      const prod = await tx.product.findUnique({ where: { id: output.productId } });
      if (!prod) continue;

      const prevStock = Number(prod.stockQty);
      const prevCost = Number(prod.cost ?? 0);
      const weight = Number(output.weightKg);
      const newStock = Math.max(0, +(prevStock - weight).toFixed(3));
      const newCost = newStock > 0
        ? +((prevCost * prevStock - Number(output.totalCost)) / newStock).toFixed(2)
        : 0;

      await tx.product.update({
        where: { id: output.productId },
        data: { stockQty: newStock, cost: newCost },
      });

      await tx.inventoryMovement.create({
        data: {
          productId: output.productId,
          type: "PROCESSING_REVERT",
          quantity: weight,
          previousQty: prevStock,
          newQty: newStock,
          unitCost: Number(output.costPerKg),
          totalValue: Number(output.totalCost),
          notes: `Reversión procesamiento ${batch.code}: ${batch.animalType}`,
          userId,
        },
      });
    }

    const inputProd = await tx.product.findUnique({ where: { id: batch.inputProductId } });
    if (inputProd) {
      const prevInputStock = Number(inputProd.stockQty);
      const newInputStock = +(prevInputStock + Number(batch.inputWeightKg)).toFixed(3);
      await tx.product.update({
        where: { id: batch.inputProductId },
        data: { stockQty: newInputStock },
      });
      await tx.inventoryMovement.create({
        data: {
          productId: batch.inputProductId,
          type: "PROCESSING_REVERT",
          quantity: Number(batch.inputWeightKg),
          previousQty: prevInputStock,
          newQty: newInputStock,
          unitCost: Number(batch.inputWeightKg) > 0
            ? +(Number(batch.totalCost) / Number(batch.inputWeightKg)).toFixed(2)
            : 0,
          totalValue: Number(batch.totalCost),
          notes: `Reversión procesamiento ${batch.code}: insumo devuelto`,
          userId,
        },
      });
    }

    return tx.processingBatch.update({
      where: { id },
      data: { status: "DRAFT", completedAt: null },
      include: batchInclude,
    });
  });

  return res.json(result);
}

export async function remove(req: Request, res: Response) {
  const id = Number(req.params.id);
  const userId = req.user!.userId;

  const batch = await prisma.processingBatch.findUnique({
    where: { id },
    include: { outputs: true },
  });
  if (!batch) throw new AppError(404, "Proceso no encontrado");
  if (batch.status !== "DRAFT" && batch.status !== "CANCELLED" && batch.status !== "COMPLETED") {
    throw new AppError(400, "No se puede eliminar este proceso");
  }

  if (batch.status === "COMPLETED") {
    await prisma.$transaction(async (tx) => {
      for (const output of batch.outputs) {
        const prod = await tx.product.findUnique({ where: { id: output.productId } });
        if (!prod) continue;

        const prevStock = Number(prod.stockQty);
        const weight = Number(output.weightKg);
        const newStock = Math.max(0, +(prevStock - weight).toFixed(3));
        const prevCost = Number(prod.cost ?? 0);
        const newCost = newStock > 0
          ? +((prevCost * prevStock - Number(output.totalCost)) / newStock).toFixed(2)
          : 0;

        await tx.product.update({
          where: { id: output.productId },
          data: { stockQty: newStock, cost: newCost },
        });

        await tx.inventoryMovement.create({
          data: {
            productId: output.productId,
            type: "PROCESSING_REVERT",
            quantity: weight,
            previousQty: prevStock,
            newQty: newStock,
            unitCost: Number(output.costPerKg),
            totalValue: Number(output.totalCost),
            notes: `Eliminación procesamiento ${batch.code}: reversión de stock`,
            userId,
          },
        });
      }

      const inputProd = await tx.product.findUnique({ where: { id: batch.inputProductId } });
      if (inputProd) {
        const prevInputStock = Number(inputProd.stockQty);
        const newInputStock = +(prevInputStock + Number(batch.inputWeightKg)).toFixed(3);
        await tx.product.update({
          where: { id: batch.inputProductId },
          data: { stockQty: newInputStock },
        });
        await tx.inventoryMovement.create({
          data: {
            productId: batch.inputProductId,
            type: "PROCESSING_REVERT",
            quantity: Number(batch.inputWeightKg),
            previousQty: prevInputStock,
            newQty: newInputStock,
            unitCost: Number(batch.inputWeightKg) > 0
              ? +(Number(batch.totalCost) / Number(batch.inputWeightKg)).toFixed(2)
              : 0,
            totalValue: Number(batch.totalCost),
            notes: `Eliminación procesamiento ${batch.code}: insumo devuelto`,
            userId,
          },
        });
      }

      await tx.processingBatch.delete({ where: { id } });
    });
  } else {
    await prisma.processingBatch.delete({ where: { id } });
  }

  return res.json({ message: "Proceso eliminado permanentemente" });
}

export async function analysis(req: Request, res: Response) {
  const id = Number(req.params.id);
  const batch = await prisma.processingBatch.findUnique({
    where: { id },
    include: { outputs: true },
  });
  if (!batch) throw new AppError(404, "Proceso no encontrado");

  const productIds = batch.outputs.map((o) => o.productId);

  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, name: true, stockQty: true, cost: true, price: true },
  });
  const productMap = new Map(products.map((p) => [p.id, p]));

  const salesMovements = await prisma.inventoryMovement.findMany({
    where: {
      productId: { in: productIds },
      type: "SALE",
      createdAt: { gte: batch.createdAt },
    },
  });

  const totalSoldRevenue = salesMovements.reduce((s, m) => s + Number(m.totalValue ?? 0), 0);

  let soldCost = 0;
  for (const output of batch.outputs) {
    const prod = productMap.get(output.productId);
    if (prod) {
      const soldQty = +(Number(output.weightKg) - Number(prod.stockQty)).toFixed(3);
      if (soldQty > 0) {
        soldCost += soldQty * Number(output.costPerKg);
      }
    }
  }

  const totalInvested = Number(batch.totalCost);
  const recoveryPct = totalInvested > 0 ? +((soldCost / totalInvested) * 100).toFixed(1) : 0;

  const remainingStockCost = products.reduce((s, p) => s + Number(p.stockQty) * Number(p.cost ?? 0), 0);
  const expectedRevenue = products.reduce((s, p) => s + Number(p.stockQty) * Number(p.price), 0);

  const cuts = batch.outputs.map((o) => {
    const prod = productMap.get(o.productId);
    const stockQty = Number(prod?.stockQty ?? 0);
    const soldQty = +(Number(o.weightKg) - stockQty).toFixed(3);
    const salePrice = Number(prod?.price ?? 0);
    const costPerKg = Number(o.costPerKg);
    return {
      productId: o.productId,
      productName: prod?.name ?? "?",
      weightKg: Number(o.weightKg),
      costPerKg,
      totalCost: Number(o.totalCost),
      salePrice,
      stockQty,
      soldQty: Math.max(0, soldQty),
      margin: salePrice > 0 ? +(((salePrice - costPerKg) / salePrice) * 100).toFixed(1) : 0,
    };
  });

  return res.json({
    code: batch.code,
    status: batch.status,
    animalType: batch.animalType,
    totalInvested,
    totalOutputWeight: batch.outputs.reduce((s, o) => s + Number(o.weightKg), 0),
    wasteKg: Number(batch.wasteWeightKg),
    costPerKgUniform: +totalInvested.toFixed(2),
    cuts,
    recovery: {
      soldCost: +soldCost.toFixed(2),
      recoveredRevenue: +totalSoldRevenue.toFixed(2),
      recoveryPct,
      remainingStockCost: +remainingStockCost.toFixed(2),
      remainingStockRevenue: +expectedRevenue.toFixed(2),
      expectedProfit: +(totalSoldRevenue + expectedRevenue - totalInvested).toFixed(2),
    },
    completedAt: batch.completedAt,
    createdAt: batch.createdAt,
  });
}

export async function summary(req: Request, res: Response) {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const batches = await prisma.processingBatch.findMany({
    where: { createdAt: { gte: startOfMonth }, status: "COMPLETED" },
    include: { outputs: { select: { totalCost: true, weightKg: true, productId: true } } },
  });

  const totalInvested = batches.reduce((s, b) => s + Number(b.totalCost), 0);
  const totalOutputWeight = batches.reduce((s, b) => s + b.outputs.reduce((s2, o) => s2 + Number(o.weightKg), 0), 0);

  const productIds = [...new Set(batches.flatMap((b) => b.outputs.map((o) => o.productId)))];
  let totalRecoveredCost = 0;
  let totalRecoveredRevenue = 0;

  if (productIds.length > 0) {
    const sales = await prisma.inventoryMovement.findMany({
      where: {
        productId: { in: productIds },
        type: "SALE",
        createdAt: { gte: startOfMonth },
      },
    });
    totalRecoveredRevenue = sales.reduce((s, m) => s + Number(m.totalValue ?? 0), 0);
    totalRecoveredCost = sales.reduce((s, m) => s + Number(m.unitCost ?? 0) * Number(m.quantity), 0);
  }

  const recoveryPct = totalInvested > 0 ? +((totalRecoveredCost / totalInvested) * 100).toFixed(1) : 0;

  return res.json({
    month: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`,
    activeBatches: batches.length,
    totalInvested: +totalInvested.toFixed(2),
    totalOutputWeight: +totalOutputWeight.toFixed(3),
    totalRecoveredCost: +totalRecoveredCost.toFixed(2),
    totalRecoveredRevenue: +totalRecoveredRevenue.toFixed(2),
    recoveryPct,
    pendingRecovery: +(totalInvested - totalRecoveredCost).toFixed(2),
  });
}
