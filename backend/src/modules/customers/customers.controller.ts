import { Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../../config/database";
import {
  createCustomerSchema,
  updateCustomerSchema,
  createPaymentSchema,
} from "./customers.schema";

export async function list(req: Request, res: Response) {
  const { q, active } = req.query;
  const where: Prisma.CustomerWhereInput = {};
  if (active === "true") where.active = true;
  else if (active === "false") where.active = false;
  if (q && typeof q === "string") {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { phone: { contains: q } },
      { document: { contains: q } },
    ];
  }
  const customers = await prisma.customer.findMany({
    where,
    orderBy: { name: "asc" },
    include: { _count: { select: { sales: true, payments: true } } },
  });
  return res.json(customers);
}

export async function getOne(req: Request, res: Response) {
  const id = Number(req.params.id);
  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      sales: {
        where: { isCredit: true, creditBalance: { gt: 0 } },
        orderBy: { createdAt: "desc" },
        take: 50,
      },
      payments: { orderBy: { createdAt: "desc" }, take: 50 },
    },
  });
  if (!customer) return res.status(404).json({ error: "Cliente no encontrado" });
  return res.json(customer);
}

export async function create(req: Request, res: Response) {
  const parsed = createCustomerSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Body inválido", details: parsed.error.errors });
  const customer = await prisma.customer.create({ data: parsed.data });
  return res.status(201).json(customer);
}

export async function update(req: Request, res: Response) {
  const id = Number(req.params.id);
  const parsed = updateCustomerSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Body inválido", details: parsed.error.errors });
  const customer = await prisma.customer.update({ where: { id }, data: parsed.data });
  return res.json(customer);
}

export async function remove(req: Request, res: Response) {
  const id = Number(req.params.id);
  await prisma.customer.update({ where: { id }, data: { active: false } });
  return res.json({ message: "Cliente desactivado" });
}

/**
 * Registra un pago / abono de un cliente. Reduce deuda del cliente y aplica FIFO
 * a las ventas a crédito pendientes (más antiguas primero) hasta agotar el monto.
 */
export async function createPayment(req: Request, res: Response) {
  const parsed = createPaymentSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Body inválido", details: parsed.error.errors });
  const userId = req.user!.userId;
  const input = parsed.data;

  const customer = await prisma.customer.findUnique({ where: { id: input.customerId } });
  if (!customer) return res.status(404).json({ error: "Cliente no encontrado" });

  // Si el monto supera la deuda total, sólo se aplica el saldo real y se devuelve el excedente como vuelto.
  const totalDebt = Number(customer.currentDebt);
  const applied = Math.min(input.amount, totalDebt);
  const change = Math.max(0, input.amount - totalDebt);

  if (applied <= 0) {
    return res.status(400).json({ error: "El cliente no tiene deuda pendiente" });
  }

  const result = await prisma.$transaction(async (tx) => {
    // 1. Crear registro de pago (sólo lo realmente aplicado)
    const created = await tx.customerPayment.create({
      data: {
        customerId: input.customerId,
        saleId: input.saleId ?? null,
        amount: applied,
        method: input.method,
        reference: input.reference ?? null,
        evidence: input.evidence ?? null,
        notes: input.notes ?? null,
        userId,
      },
    });

    // 2. Si apunta a una venta específica, aplica sólo a esa. Sino FIFO.
    let remaining = applied;
    if (input.saleId) {
      const sale = await tx.sale.findUnique({ where: { id: input.saleId } });
      if (sale && sale.isCredit && Number(sale.creditBalance) > 0) {
        const apply = Math.min(Number(sale.creditBalance), remaining);
        await tx.sale.update({
          where: { id: sale.id },
          data: { creditBalance: { decrement: apply } },
        });
        remaining -= apply;
      }
    } else {
      const pendingSales = await tx.sale.findMany({
        where: { customerId: input.customerId, isCredit: true, creditBalance: { gt: 0 } },
        orderBy: { createdAt: "asc" },
      });
      for (const sale of pendingSales) {
        if (remaining <= 0) break;
        const apply = Math.min(Number(sale.creditBalance), remaining);
        await tx.sale.update({
          where: { id: sale.id },
          data: { creditBalance: { decrement: apply } },
        });
        remaining -= apply;
      }
    }

    // 3. Reducir deuda total del cliente (sólo lo aplicado)
    await tx.customer.update({
      where: { id: input.customerId },
      data: { currentDebt: { decrement: applied } },
    });

    // 4. Si el pago es en efectivo, registrar movimiento en caja
    if (input.method === "CASH") {
      try {
        await tx.cashMovement.create({
          data: {
            type: "CASH_IN",
            amount: applied,
            reason: `Abono cliente: ${customer.name}`,
            source: "CUSTOMER_PAYMENT" as any,
            userId,
          } as any,
        });
      } catch { /* fallback: sin source si Prisma client no lo conoce */ }
    }

    return created;
  });

  return res.status(201).json({ ...result, appliedAmount: applied, change });
}

export async function listPayments(req: Request, res: Response) {
  const customerId = req.query.customerId ? Number(req.query.customerId) : undefined;
  const where: Prisma.CustomerPaymentWhereInput = {};
  if (customerId) where.customerId = customerId;
  const payments = await prisma.customerPayment.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { customer: { select: { id: true, name: true } } },
    take: 200,
  });
  return res.json(payments);
}
