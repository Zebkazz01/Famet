import { Request, Response } from "express";
import { prisma } from "../../config/database";
import { CreateSupplierInput, UpdateSupplierInput } from "./suppliers.schema";

export async function getSuppliers(req: Request, res: Response) {
  const { search, active } = req.query;
  const where: any = {};
  if (active !== "all") where.active = true;
  if (search) {
    where.OR = [
      { name: { contains: String(search), mode: "insensitive" } },
      { nit: { contains: String(search), mode: "insensitive" } },
      { city: { contains: String(search), mode: "insensitive" } },
    ];
  }
  const suppliers = await prisma.supplier.findMany({
    where,
    include: { _count: { select: { products: true } } },
    orderBy: { name: "asc" },
  });
  return res.json(suppliers);
}

export async function getSupplier(req: Request, res: Response) {
  const id = Number(req.params.id);
  const supplier = await prisma.supplier.findUnique({
    where: { id },
    include: { products: { where: { active: true }, select: { id: true, name: true, price: true } } },
  });
  if (!supplier) return res.status(404).json({ error: "Proveedor no encontrado" });
  return res.json(supplier);
}

export async function createSupplier(req: Request, res: Response) {
  const data = req.body as CreateSupplierInput;
  const supplier = await prisma.supplier.create({ data });
  return res.status(201).json(supplier);
}

export async function updateSupplier(req: Request, res: Response) {
  const id = Number(req.params.id);
  const data = req.body as UpdateSupplierInput;
  const supplier = await prisma.supplier.update({ where: { id }, data });
  return res.json(supplier);
}

export async function deleteSupplier(req: Request, res: Response) {
  const id = Number(req.params.id);
  await prisma.supplier.update({ where: { id }, data: { active: false } });
  return res.json({ message: "Proveedor desactivado" });
}
