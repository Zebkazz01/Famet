import { Request, Response } from "express";
import { prisma } from "../../config/database";
import { CreateProductInput, UpdateProductInput } from "./products.schema";

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
    include: { category: true },
    orderBy: { name: "asc" },
  });
  return res.json(products);
}

export async function getProduct(req: Request, res: Response) {
  const id = Number(req.params.id);
  const product = await prisma.product.findUnique({
    where: { id },
    include: { category: true },
  });
  if (!product) return res.status(404).json({ error: "Producto no encontrado" });
  return res.json(product);
}

export async function createProduct(req: Request, res: Response) {
  const data = req.body as CreateProductInput;
  const product = await prisma.product.create({
    data,
    include: { category: true },
  });
  return res.status(201).json(product);
}

export async function updateProduct(req: Request, res: Response) {
  const id = Number(req.params.id);
  const data = req.body as UpdateProductInput;
  const product = await prisma.product.update({
    where: { id },
    data,
    include: { category: true },
  });
  return res.json(product);
}

export async function deleteProduct(req: Request, res: Response) {
  const id = Number(req.params.id);
  await prisma.product.update({ where: { id }, data: { active: false } });
  return res.json({ message: "Producto desactivado" });
}
