import { Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../../config/database";
import { CreateCategoryInput, UpdateCategoryInput } from "./categories.schema";

export async function getCategories(req: Request, res: Response) {
  const showAll = req.query.active === "all";
  const categories = await prisma.category.findMany({
    where: showAll ? {} : { active: true },
    orderBy: { name: "asc" },
    include: {
      _count: { select: { products: true } },
      parent: { select: { id: true, name: true } },
      children: { select: { id: true, name: true } },
    },
  });
  return res.json(categories);
}

export async function createCategory(req: Request, res: Response) {
  const data = req.body as CreateCategoryInput;
  const payload: Prisma.CategoryCreateInput = {
    name: data.name,
    color: data.color,
    description: data.description ?? null,
    cookingMethods: (data.cookingMethods ?? []) as any,
    animalType: data.animalType ?? null,
    animalPart: data.animalPart ?? null,
    ...(data.parentId ? { parent: { connect: { id: data.parentId } } } : {}),
  };
  const category = await prisma.category.create({ data: payload });
  return res.status(201).json(category);
}

export async function updateCategory(req: Request, res: Response) {
  const id = Number(req.params.id);
  const data = req.body as UpdateCategoryInput;
  const update: Prisma.CategoryUpdateInput = {};
  if (data.name !== undefined) update.name = data.name;
  if (data.color !== undefined) update.color = data.color;
  if (data.description !== undefined) update.description = data.description ?? null;
  if (data.cookingMethods !== undefined) update.cookingMethods = (data.cookingMethods ?? []) as any;
  if (data.animalType !== undefined) update.animalType = data.animalType ?? null;
  if (data.animalPart !== undefined) update.animalPart = data.animalPart ?? null;
  if (data.parentId !== undefined) {
    if (data.parentId === null) update.parent = { disconnect: true };
    else update.parent = { connect: { id: data.parentId } };
  }
  const category = await prisma.category.update({ where: { id }, data: update });
  return res.json(category);
}

export async function deleteCategory(req: Request, res: Response) {
  const id = Number(req.params.id);
  await prisma.category.update({ where: { id }, data: { active: false } });
  return res.json({ message: "Categoría desactivada" });
}
