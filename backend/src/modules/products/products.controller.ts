import { Request, Response } from "express";
import { prisma } from "../../config/database";
import { CreateProductInput, UpdateProductInput } from "./products.schema";
import * as barcodeService from "../barcodes/barcodeService";

export async function getProducts(req: Request, res: Response) {
  const { category, search, active } = req.query;

  const where: any = {};
  if (active !== "all") where.active = true;
  if (category) where.categoryId = Number(category);
  if (search) {
    where.OR = [
      { name: { contains: String(search), mode: "insensitive" } },
      { sku: { contains: String(search), mode: "insensitive" } },
      { barcode: { contains: String(search), mode: "insensitive" } },
    ];
  }

  const products = await prisma.product.findMany({
    where,
    include: {
      category: true,
      supplier: { select: { id: true, name: true } },
      batches: { where: { qty: { gt: 0 } }, orderBy: { expiryDate: "asc" }, take: 1 },
      discountRules: { where: { active: true }, select: { id: true, type: true, config: true, priority: true } },
    },
    orderBy: { name: "asc" },
  });
  return res.json(products);
}

export async function getProduct(req: Request, res: Response) {
  const id = Number(req.params.id);
  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      category: true,
      supplier: { select: { id: true, name: true } },
      batches: { orderBy: { expiryDate: "asc" } },
    },
  });
  if (!product) return res.status(404).json({ error: "Producto no encontrado" });
  return res.json(product);
}

export async function createProduct(req: Request, res: Response) {
  const { bulkCost, ...data } = req.body as CreateProductInput & { bulkCost?: number };

  // Calcular costo unitario desde costo total del lote
  if (bulkCost && data.stockQty && data.stockQty > 0) {
    data.cost = bulkCost / data.stockQty;
  }

  const product = await prisma.product.create({
    data,
    include: { category: true, supplier: { select: { id: true, name: true } } },
  });

  // Registrar precio inicial en historial
  await prisma.priceHistory.create({
    data: { productId: product.id, price: product.price, cost: product.cost, notes: "Precio inicial" },
  });

  // Registrar alias barcode → categoría para historial cross-supplier
  if (product.barcode) {
    try { await barcodeService.registerAlias(product.barcode, product.categoryId, product.id); } catch {}
  }

  return res.status(201).json(product);
}

export async function updateProduct(req: Request, res: Response) {
  const id = Number(req.params.id);
  const { bulkCost, ...data } = req.body as UpdateProductInput & { bulkCost?: number };

  // Calcular costo unitario desde costo total del lote
  if (bulkCost && data.stockQty && data.stockQty > 0) {
    data.cost = bulkCost / data.stockQty;
  }

  // Obtener precio actual para comparar
  const current = await prisma.product.findUnique({ where: { id } });

  const product = await prisma.product.update({
    where: { id },
    data,
    include: { category: true, supplier: { select: { id: true, name: true } } },
  });

  // Registrar en historial si cambió precio o costo
  if (current && (data.price !== undefined || data.cost !== undefined)) {
    const priceChanged = data.price !== undefined && !current.price.equals(product.price);
    const costChanged = data.cost !== undefined && (
      (!current.cost && product.cost) ||
      (current.cost && product.cost && !current.cost.equals(product.cost))
    );
    if (priceChanged || costChanged) {
      await prisma.priceHistory.create({
        data: { productId: id, price: product.price, cost: product.cost, notes: "Actualización de precio" },
      });
    }
  }

  // Registrar/actualizar alias barcode
  if (product.barcode) {
    try { await barcodeService.registerAlias(product.barcode, product.categoryId, product.id); } catch {}
  }

  return res.json(product);
}

export async function deleteProduct(req: Request, res: Response) {
  const id = Number(req.params.id);
  await prisma.product.update({ where: { id }, data: { active: false } });
  return res.json({ message: "Producto desactivado" });
}

export async function getPriceHistory(req: Request, res: Response) {
  const productId = Number(req.params.id);
  const history = await prisma.priceHistory.findMany({
    where: { productId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return res.json(history);
}
