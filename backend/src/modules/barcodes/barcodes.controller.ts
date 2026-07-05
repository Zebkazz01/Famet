import { Request, Response } from "express";
import { prisma } from "../../config/database";
import * as barcodeService from "./barcodeService";

export async function resolve(req: Request, res: Response) {
  const code = String(req.params.code || "").trim();
  if (!code) return res.status(400).json({ error: "Código vacío" });
  const result = await barcodeService.resolve(code);
  return res.json(result);
}

export async function history(req: Request, res: Response) {
  const { categoryId } = req.query;
  const where: any = {};
  if (categoryId) where.categoryId = Number(categoryId);
  const items = await prisma.categoryBarcode.findMany({
    where,
    orderBy: { lastSeenAt: "desc" },
    include: {
      category: true,
      lastProduct: { select: { id: true, name: true, active: true } },
    },
  });
  return res.json(items);
}

export async function remove(req: Request, res: Response) {
  const id = Number(req.params.id);
  await prisma.categoryBarcode.delete({ where: { id } });
  return res.json({ message: "Alias eliminado" });
}

export async function assignToProduct(req: Request, res: Response) {
  const { code, productId } = req.body as { code: string; productId: number };
  if (!code || !productId) return res.status(400).json({ error: "Faltan datos" });
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) return res.status(404).json({ error: "Producto no encontrado" });
  const alias = await barcodeService.registerAlias(code, product.categoryId, productId);
  // Si el producto activo no tiene barcode, asignarle este
  if (!product.barcode) {
    await prisma.product.update({ where: { id: productId }, data: { barcode: code } });
  }
  return res.json(alias);
}
