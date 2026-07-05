import { Request, Response } from "express";
import { prisma } from "../../config/database";

export async function getAll(req: Request, res: Response) {
  const userId = req.user!.userId;
  const items = await prisma.userPreference.findMany({ where: { userId } });
  const map: Record<string, any> = {};
  for (const item of items) map[item.key] = item.value;
  return res.json(map);
}

export async function getOne(req: Request, res: Response) {
  const userId = req.user!.userId;
  const key = String(req.params.key);
  const item = await prisma.userPreference.findUnique({ where: { userId_key: { userId, key } } });
  return res.json({ key, value: item?.value ?? null });
}

export async function setOne(req: Request, res: Response) {
  const userId = req.user!.userId;
  const key = String(req.params.key);
  const value = req.body?.value ?? req.body ?? null;
  const item = await prisma.userPreference.upsert({
    where: { userId_key: { userId, key } },
    update: { value: value as any },
    create: { userId, key, value: value as any },
  });
  return res.json({ key: item.key, value: item.value });
}

export async function remove(req: Request, res: Response) {
  const userId = req.user!.userId;
  const key = String(req.params.key);
  await prisma.userPreference.deleteMany({ where: { userId, key } });
  return res.json({ message: "Eliminada" });
}
