import { Request, Response } from "express";
import { prisma } from "../../config/database";
import { createRuleSchema, updateRuleSchema, previewSchema } from "./discounts.schema";
import { evaluate } from "./discountEngine";

export async function listForProduct(req: Request, res: Response) {
  const productId = Number(req.params.id);
  const rules = await prisma.productDiscountRule.findMany({
    where: { productId },
    orderBy: [{ active: "desc" }, { priority: "desc" }, { createdAt: "desc" }],
  });
  return res.json(rules);
}

export async function listAll(_req: Request, res: Response) {
  const rules = await prisma.productDiscountRule.findMany({
    include: { product: { select: { id: true, name: true, price: true } } },
    orderBy: [{ active: "desc" }, { priority: "desc" }, { createdAt: "desc" }],
  });
  return res.json(rules);
}

export async function createRule(req: Request, res: Response) {
  const parsed = createRuleSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Datos inválidos", details: parsed.error.errors });
  const data = parsed.data;
  const product = await prisma.product.findUnique({ where: { id: data.productId } });
  if (!product) return res.status(404).json({ error: "Producto no encontrado" });
  const created = await prisma.productDiscountRule.create({
    data: {
      productId: data.productId,
      type: data.type,
      config: data.config as any,
      active: data.active ?? true,
      priority: data.priority ?? 0,
      validFrom: data.validFrom ? new Date(data.validFrom) : null,
      validTo: data.validTo ? new Date(data.validTo) : null,
    },
  });
  return res.status(201).json(created);
}

export async function updateRule(req: Request, res: Response) {
  const id = Number(req.params.id);
  const parsed = updateRuleSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Datos inválidos", details: parsed.error.errors });
  const data: any = {};
  if (parsed.data.type !== undefined) data.type = parsed.data.type;
  if (parsed.data.config !== undefined) data.config = parsed.data.config;
  if (parsed.data.active !== undefined) data.active = parsed.data.active;
  if (parsed.data.priority !== undefined) data.priority = parsed.data.priority;
  if (parsed.data.validFrom !== undefined) data.validFrom = parsed.data.validFrom ? new Date(parsed.data.validFrom) : null;
  if (parsed.data.validTo !== undefined) data.validTo = parsed.data.validTo ? new Date(parsed.data.validTo) : null;
  const updated = await prisma.productDiscountRule.update({ where: { id }, data });
  return res.json(updated);
}

export async function deleteRule(req: Request, res: Response) {
  const id = Number(req.params.id);
  await prisma.productDiscountRule.delete({ where: { id } });
  return res.json({ message: "Regla eliminada" });
}

export async function previewDiscount(req: Request, res: Response) {
  const parsed = previewSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Datos inválidos", details: parsed.error.errors });
  const productIds = [...new Set(parsed.data.items.map((i) => i.productId))];
  const rules = await prisma.productDiscountRule.findMany({
    where: { productId: { in: productIds }, active: true },
  });
  const result = evaluate(parsed.data.items, rules);
  return res.json(result);
}
