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

export async function getTopSellers(req: Request, res: Response) {
  const top = await prisma.saleItem.groupBy({
    by: ["productId"],
    _sum: { quantity: true },
    orderBy: { _sum: { quantity: "desc" } },
    take: 10,
    where: {
      sale: { createdAt: { gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) } },
    },
  });

  const ids = top.map((t) => t.productId);
  if (ids.length === 0) return res.json([]);

  const products = await prisma.product.findMany({
    where: { id: { in: ids }, active: true },
    include: {
      category: true,
      supplier: { select: { id: true, name: true } },
      batches: { where: { qty: { gt: 0 } }, orderBy: { expiryDate: "asc" }, take: 1 },
      discountRules: { where: { active: true }, select: { id: true, type: true, config: true, priority: true } },
    },
  });

  const sorted = ids.map((id) => products.find((p) => p.id === id)).filter(Boolean);
  return res.json(sorted);
}

export async function getProduct(req: Request, res: Response) {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: "ID inválido" });
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

  // Validar nombre único (case-insensitive)
  const existing = await prisma.product.findFirst({
    where: { name: { equals: data.name, mode: "insensitive" } },
  });
  if (existing) {
    return res.status(409).json({ error: `Ya existe un producto llamado "${data.name}"` });
  }

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

  // Validar nombre único (case-insensitive) si se está cambiando el nombre
  if (data.name) {
    const existing = await prisma.product.findFirst({
      where: { name: { equals: data.name, mode: "insensitive" }, id: { not: id } },
    });
    if (existing) {
      return res.status(409).json({ error: `Ya existe un producto llamado "${data.name}"` });
    }
  }

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

const RELATION_LABELS: Record<string, string> = {
  saleItems: "Ventas",
  inventoryMovements: "Movimientos de inventario",
  priceHistory: "Historial de precios",
  purchaseOrderItems: "Órdenes de compra",
};

async function getProductRelationCounts(id: number) {
  const [saleItems, inventoryMovements, priceHistory, purchaseOrderItems, processingBatches, processingOutputs] = await Promise.all([
    prisma.saleItem.count({ where: { productId: id } }),
    prisma.inventoryMovement.count({ where: { productId: id } }),
    prisma.priceHistory.count({ where: { productId: id } }),
    prisma.purchaseOrderItem.count({ where: { productId: id } }),
    prisma.processingBatch.count({ where: { inputProductId: id } }),
    prisma.processingOutput.count({ where: { productId: id } }),
  ]);
  return { saleItems, inventoryMovements, priceHistory, purchaseOrderItems, processingBatches, processingOutputs };
}

export async function deleteProduct(req: Request, res: Response) {
  const id = Number(req.params.id);
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) return res.status(404).json({ error: "Producto no encontrado" });
  if (product.active) {
    await prisma.product.update({ where: { id }, data: { active: false } });
    return res.json({ message: "Producto desactivado" });
  }
  const details = await getProductRelationCounts(id);
  const total = Object.values(details).reduce((a, b) => a + b, 0);
  if (total > 0) {
    return res.status(400).json({
      error: `No se puede eliminar, el producto tiene ${total} registro(s) asociado(s)`,
      details,
    });
  }
  await prisma.product.delete({ where: { id } });
  return res.json({ message: "Producto eliminado permanentemente" });
}

export async function getProductSalesCount(req: Request, res: Response) {
  const id = Number(req.params.id);
  const details = await getProductRelationCounts(id);
  const total = Object.values(details).reduce((a, b) => a + b, 0);
  return res.json({ count: total, canDelete: total === 0, details });
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

export async function deletePriceHistory(req: Request, res: Response) {
  const productId = Number(req.params.id);
  const historyId = Number(req.params.historyId);
  const entry = await prisma.priceHistory.findFirst({
    where: { id: historyId, productId },
  });
  if (!entry) return res.status(404).json({ error: "Registro no encontrado" });
  await prisma.priceHistory.delete({ where: { id: historyId } });
  return res.json({ message: "Registro de precio eliminado" });
}

export async function mergeProduct(req: Request, res: Response) {
  const { sourceId, targetId } = req.body as { sourceId: number; targetId: number };
  if (!sourceId || !targetId) return res.status(400).json({ error: "sourceId y targetId requeridos" });
  if (sourceId === targetId) return res.status(400).json({ error: "No se puede fusionar un producto consigo mismo" });

  const [source, target] = await Promise.all([
    prisma.product.findUnique({ where: { id: sourceId } }),
    prisma.product.findUnique({ where: { id: targetId } }),
  ]);
  if (!source) return res.status(404).json({ error: "Producto origen no encontrado" });
  if (!target) return res.status(404).json({ error: "Producto destino no encontrado" });

  const updated: Record<string, number> = {};
  const errors: string[] = [];

  // 1. SaleItems
  updated.saleItems = await prisma.saleItem.updateMany({ where: { productId: sourceId }, data: { productId: targetId } }).then(r => r.count);

  // 2. InventoryMovements
  updated.inventoryMovements = await prisma.inventoryMovement.updateMany({ where: { productId: sourceId }, data: { productId: targetId } }).then(r => r.count);

  // 3. PriceHistory
  updated.priceHistory = await prisma.priceHistory.updateMany({ where: { productId: sourceId }, data: { productId: targetId } }).then(r => r.count);

  // 4. PurchaseOrderItems
  updated.purchaseOrderItems = await prisma.purchaseOrderItem.updateMany({ where: { productId: sourceId }, data: { productId: targetId } }).then(r => r.count);

  // 5. ProcessingBatches
  updated.processingBatches = await prisma.processingBatch.updateMany({ where: { inputProductId: sourceId }, data: { inputProductId: targetId } }).then(r => r.count);

  // 6. ProcessingOutputs
  updated.processingOutputs = await prisma.processingOutput.updateMany({ where: { productId: sourceId }, data: { productId: targetId } }).then(r => r.count);

  // 7. ProductBatches (onDelete: Cascade en schema, pero migramos manual)
  updated.productBatches = await prisma.productBatch.updateMany({ where: { productId: sourceId }, data: { productId: targetId } }).then(r => r.count);

  // 8. ProductDiscountRules (onDelete: Cascade en schema, migramos manual)
  updated.productDiscountRules = await prisma.productDiscountRule.updateMany({ where: { productId: sourceId }, data: { productId: targetId } }).then(r => r.count);

  // 9. CategoryBarcodes (lastProductId — onDelete: SetNull)
  updated.categoryBarcodes = await prisma.categoryBarcode.updateMany({ where: { lastProductId: sourceId }, data: { lastProductId: targetId } }).then(r => r.count);

  // Acumular stock del source en target
  const sourceStock = Number(source.stockQty);
  const targetStock = Number(target.stockQty);
  if (sourceStock > 0) {
    await prisma.product.update({ where: { id: targetId }, data: { stockQty: targetStock + sourceStock } });
  }

  // Desactivar y eliminar source
  await prisma.product.update({ where: { id: sourceId }, data: { active: false } });
  await prisma.product.delete({ where: { id: sourceId } });

  return res.json({
    message: `Producto "${source.name}" fusionado en "${target.name}"`,
    sourceDeleted: sourceId,
    targetKept: targetId,
    updated,
    errors: errors.length > 0 ? errors : undefined,
  });
}
