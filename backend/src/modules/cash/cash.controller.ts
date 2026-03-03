import { Request, Response } from "express";
import { Decimal } from "@prisma/client/runtime/library";
import { prisma } from "../../config/database";
import { CreateCashMovementInput, CreateCashClosingInput } from "./cash.schema";

export async function createCashMovement(req: Request, res: Response) {
  const input = req.body as CreateCashMovementInput;
  const userId = req.user!.userId;

  const movement = await prisma.cashMovement.create({
    data: {
      type: input.type,
      amount: input.amount,
      reason: input.reason,
      userId,
    },
    include: {
      user: { select: { firstName: true, lastName: true } },
    },
  });

  return res.status(201).json(movement);
}

export async function getCashMovements(req: Request, res: Response) {
  const { date } = req.query;

  const where: any = {};
  if (date) {
    const day = String(date);
    where.createdAt = {
      gte: new Date(day + "T00:00:00"),
      lte: new Date(day + "T23:59:59"),
    };
  }

  const movements = await prisma.cashMovement.findMany({
    where,
    include: {
      user: { select: { firstName: true, lastName: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return res.json(movements);
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
