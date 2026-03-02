import { Request, Response } from "express";
import { prisma } from "../../config/database";
import { CreateCategoryInput, UpdateCategoryInput } from "./categories.schema";

export async function getCategories(_req: Request, res: Response) {
  const categories = await prisma.category.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
    include: { _count: { select: { products: true } } },
  });
  return res.json(categories);
}

export async function createCategory(req: Request, res: Response) {
  const data = req.body as CreateCategoryInput;
  const category = await prisma.category.create({ data });
  return res.status(201).json(category);
}

export async function updateCategory(req: Request, res: Response) {
  const id = Number(req.params.id);
  const data = req.body as UpdateCategoryInput;
  const category = await prisma.category.update({ where: { id }, data });
  return res.json(category);
}

export async function deleteCategory(req: Request, res: Response) {
  const id = Number(req.params.id);
  await prisma.category.update({ where: { id }, data: { active: false } });
  return res.json({ message: "Categoría desactivada" });
}
