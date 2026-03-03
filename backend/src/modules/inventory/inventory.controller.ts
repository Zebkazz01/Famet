import { Request, Response } from "express";
import { Decimal } from "@prisma/client/runtime/library";
import { prisma } from "../../config/database";
import { CreateMovementInput } from "./inventory.schema";
import { AppError } from "../../middleware/errorHandler";

export async function createMovement(req: Request, res: Response) {
  const input = req.body as CreateMovementInput;
  const userId = req.user!.userId;

  const movement = await prisma.$transaction(async (tx) => {
    const product = await tx.product.findUnique({ where: { id: input.productId } });
    if (!product) throw new AppError(404, "Producto no encontrado");

    const qty = new Decimal(input.quantity);
    let newQty: Decimal;

    if (input.type === "ENTRY" || input.type === "RETURN") {
      newQty = product.stockQty.add(qty);
    } else {
      // ADJUSTMENT o LOSS restan
      newQty = product.stockQty.sub(qty);
      if (newQty.lessThan(0)) {
        throw new AppError(400, "Stock resultante no puede ser negativo");
      }
    }

    await tx.product.update({
      where: { id: product.id },
      data: { stockQty: newQty },
    });

    return tx.inventoryMovement.create({
      data: {
        productId: product.id,
        type: input.type,
        quantity: qty,
        previousQty: product.stockQty,
        newQty,
        notes: input.notes || null,
        userId,
      },
      include: { product: true },
    });
  });

  return res.status(201).json(movement);
}

export async function getMovements(req: Request, res: Response) {
  const { productId, type, from, to } = req.query;

  const where: any = {};
  if (productId) where.productId = Number(productId);
  if (type) where.type = String(type);
  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt.gte = new Date(String(from));
    if (to) where.createdAt.lte = new Date(String(to) + "T23:59:59");
  }

  const movements = await prisma.inventoryMovement.findMany({
    where,
    include: { product: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return res.json(movements);
}

export async function getAlerts(_req: Request, res: Response) {
  const products = await prisma.product.findMany({
    where: {
      active: true,
      stockQty: { lte: prisma.product.fields.minStock },
    },
    include: { category: true },
    orderBy: { stockQty: "asc" },
  });

  // Prisma no soporta comparar columnas directamente, filtramos en JS
  const allProducts = await prisma.product.findMany({
    where: { active: true },
    include: { category: true },
  });

  const alerts = allProducts.filter(
    (p) => p.minStock.greaterThan(0) && p.stockQty.lessThanOrEqualTo(p.minStock)
  );

  return res.json(alerts);
}
