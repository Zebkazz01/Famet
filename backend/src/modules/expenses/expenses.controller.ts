import { Request, Response } from "express";
import { prisma } from "../../config/database";
import { Prisma } from "@prisma/client";
import { createExpenseSchema, updateExpenseSchema } from "./expenses.schema";

export async function listExpenses(req: Request, res: Response) {
  const { from, to, category, userId, q } = req.query;
  const where: Prisma.ExpenseWhereInput = {};
  if (from || to) {
    where.date = {};
    if (from) (where.date as any).gte = new Date(String(from));
    if (to) (where.date as any).lte = new Date(String(to) + "T23:59:59");
  }
  if (category) where.category = String(category);
  if (userId) where.userId = Number(userId);
  if (q) {
    where.OR = [
      { description: { contains: String(q), mode: "insensitive" } },
      { category: { contains: String(q), mode: "insensitive" } },
    ];
  }
  const items = await prisma.expense.findMany({
    where,
    orderBy: { date: "desc" },
    include: { user: { select: { firstName: true, lastName: true } } },
  });
  return res.json(items);
}

export async function getExpense(req: Request, res: Response) {
  const id = Number(req.params.id);
  const item = await prisma.expense.findUnique({
    where: { id },
    include: { user: { select: { firstName: true, lastName: true } } },
  });
  if (!item) return res.status(404).json({ error: "Gasto no encontrado" });
  return res.json(item);
}

export async function createExpense(req: Request, res: Response) {
  const parsed = createExpenseSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Datos inválidos", details: parsed.error.errors });
  const userId = req.user!.userId;
  const evidenceUrl = req.file ? `/uploads/expenses/${req.file.filename}` : null;
  const created = await prisma.expense.create({
    data: {
      amount: parsed.data.amount,
      description: parsed.data.description,
      category: parsed.data.category,
      date: new Date(parsed.data.date),
      paymentMethod: parsed.data.paymentMethod ?? null,
      evidenceUrl,
      userId,
    },
  });
  return res.status(201).json(created);
}

export async function updateExpense(req: Request, res: Response) {
  const id = Number(req.params.id);
  const parsed = updateExpenseSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Datos inválidos", details: parsed.error.errors });
  const existing = await prisma.expense.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ error: "Gasto no encontrado" });

  const data: Prisma.ExpenseUpdateInput = {};
  if (parsed.data.amount !== undefined) data.amount = parsed.data.amount;
  if (parsed.data.description !== undefined) data.description = parsed.data.description;
  if (parsed.data.category !== undefined) data.category = parsed.data.category;
  if (parsed.data.date !== undefined) data.date = new Date(parsed.data.date);
  if (parsed.data.paymentMethod !== undefined) data.paymentMethod = parsed.data.paymentMethod ?? null;
  if (req.file) data.evidenceUrl = `/uploads/expenses/${req.file.filename}`;

  const updated = await prisma.expense.update({ where: { id }, data });
  return res.json(updated);
}

export async function deleteExpense(req: Request, res: Response) {
  const id = Number(req.params.id);
  await prisma.expense.delete({ where: { id } });
  return res.json({ message: "Gasto eliminado" });
}

export async function summary(req: Request, res: Response) {
  const month = String(req.query.month || new Date().toISOString().slice(0, 7));
  const [year, mon] = month.split("-").map(Number);
  if (!year || !mon) return res.status(400).json({ error: "Mes inválido (YYYY-MM)" });
  const start = new Date(year, mon - 1, 1);
  const end = new Date(year, mon, 1);

  const items = await prisma.expense.findMany({
    where: { date: { gte: start, lt: end } },
    select: { amount: true, category: true, date: true },
  });

  const totalAmount = items.reduce((sum, e) => sum + Number(e.amount), 0);
  const byCategory: Record<string, number> = {};
  for (const e of items) {
    byCategory[e.category] = (byCategory[e.category] || 0) + Number(e.amount);
  }
  const topCategories = Object.entries(byCategory)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([category, amount]) => ({ category, amount }));

  const daysInMonth = new Date(year, mon, 0).getDate();
  const dailyAvg = totalAmount / daysInMonth;

  return res.json({
    month,
    totalAmount,
    count: items.length,
    dailyAvg,
    topCategories,
  });
}
