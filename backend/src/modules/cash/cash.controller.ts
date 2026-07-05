import { Request, Response } from "express";
import { Decimal } from "@prisma/client/runtime/library";
import { prisma } from "../../config/database";
import { CreateCashMovementInput, CreateCashClosingInput } from "./cash.schema";

export async function createCashMovement(req: Request, res: Response) {
  const input = req.body as CreateCashMovementInput;
  const userId = req.user!.userId;

  try {
    const movement = await prisma.cashMovement.create({
      data: {
        type: input.type,
        amount: input.amount,
        reason: input.reason,
        source: (input.source ?? "MANUAL") as any,
        userId,
      },
      include: {
        user: { select: { firstName: true, lastName: true } },
      },
    });
    return res.status(201).json(movement);
  } catch (e: any) {
    if (e?.message?.includes("source") || e?.code === "P2009") {
      // Prisma client aún no regenerado — crear sin source (DB usa default 'MANUAL')
      const movement = await prisma.cashMovement.create({
        data: { type: input.type, amount: input.amount, reason: input.reason, userId } as any,
        include: { user: { select: { firstName: true, lastName: true } } },
      });
      return res.status(201).json(movement);
    }
    throw e;
  }
}

export async function getCashMovements(req: Request, res: Response) {
  const { date } = req.query;

  const where: any = {};
  if (date) {
    const day = String(date);
    const [y, m, d] = day.split("-").map(Number);
    if (y && m && d) {
      const start = new Date(y, m - 1, d, 0, 0, 0, 0);
      const end = new Date(y, m - 1, d, 23, 59, 59, 999);
      where.createdAt = { gte: start, lte: end };
    }
  }

  try {
    const movements = await prisma.cashMovement.findMany({
      where,
      include: {
        user: { select: { firstName: true, lastName: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return res.json(movements);
  } catch (e: any) {
    return res.status(500).json({ error: "Error al consultar movimientos: " + e.message });
  }
}

export async function createCashClosing(req: Request, res: Response) {
  const input = req.body as CreateCashClosingInput;
  const userId = req.user!.userId;

  const difference = new Decimal(input.actualAmount).sub(new Decimal(input.expectedAmount));

  const closing = await prisma.cashClosing.create({
    data: {
      userId,
      expectedAmount: input.expectedAmount,
      actualAmount: input.actualAmount,
      difference,
      notes: input.notes || null,
    },
    include: {
      user: { select: { firstName: true, lastName: true } },
    },
  });

  return res.status(201).json(closing);
}

export async function getCashClosings(req: Request, res: Response) {
  const { from, to } = req.query;

  const where: any = {};
  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt.gte = new Date(String(from));
    if (to) where.createdAt.lte = new Date(String(to) + "T23:59:59");
  }

  const closings = await prisma.cashClosing.findMany({
    where,
    include: {
      user: { select: { firstName: true, lastName: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return res.json(closings);
}
