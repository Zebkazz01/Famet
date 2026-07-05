import { Prisma } from "@prisma/client";
import { prisma } from "../../config/database";

/**
 * Consume `quantity` unidades del producto desde sus lotes activos en orden FIFO
 * (vencimiento más próximo primero). Lanza error si no hay stock suficiente.
 * Debe ejecutarse dentro de una transacción.
 */
export async function consumeFromBatches(
  tx: Prisma.TransactionClient,
  productId: number,
  quantity: number,
): Promise<{ batchId: number; consumed: number }[]> {
  const remaining = new Prisma.Decimal(quantity);
  const batches = await tx.productBatch.findMany({
    where: { productId, qty: { gt: 0 } },
    orderBy: { expiryDate: "asc" },
  });

  // Si no hay lotes activos, no consumir nada (fallback a stockQty normal del producto)
  if (batches.length === 0) return [];

  let toConsume = remaining;
  const consumed: { batchId: number; consumed: number }[] = [];

  for (const b of batches) {
    if (toConsume.lessThanOrEqualTo(0)) break;
    const take = Prisma.Decimal.min(toConsume, b.qty);
    await tx.productBatch.update({
      where: { id: b.id },
      data: { qty: b.qty.minus(take) },
    });
    consumed.push({ batchId: b.id, consumed: take.toNumber() });
    toConsume = toConsume.minus(take);
  }
  // Si los lotes no alcanzan, NO bloquear venta (lotes pueden estar desincronizados
  // con stockQty del producto). Backend permitirá la venta y dejará que se ajuste manualmente.
  return consumed;
}

/**
 * Suma el stock total de lotes activos para un producto (útil para sync con stockQty).
 */
export async function totalBatchQty(productId: number): Promise<number> {
  const result = await prisma.productBatch.aggregate({
    where: { productId },
    _sum: { qty: true },
  });
  return Number(result._sum.qty || 0);
}

export interface ExpiringBatch {
  id: number;
  productId: number;
  productName: string;
  batchCode: string | null;
  expiryDate: Date;
  qty: number;
  daysLeft: number;
}

/**
 * Lotes próximos a vencer (≤ days). Si days=0 → solo ya vencidos.
 */
export async function getExpiring(days: number): Promise<ExpiringBatch[]> {
  const now = new Date();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + days);
  cutoff.setHours(23, 59, 59, 999);

  const batches = await prisma.productBatch.findMany({
    where: {
      qty: { gt: 0 },
      expiryDate: { lte: cutoff },
    },
    include: {
      product: { select: { id: true, name: true, active: true } },
    },
    orderBy: { expiryDate: "asc" },
  });

  return batches
    .filter((b) => b.product.active)
    .map((b) => {
      const ms = b.expiryDate.getTime() - now.getTime();
      const daysLeft = Math.ceil(ms / (1000 * 60 * 60 * 24));
      return {
        id: b.id,
        productId: b.productId,
        productName: b.product.name,
        batchCode: b.batchCode,
        expiryDate: b.expiryDate,
        qty: Number(b.qty),
        daysLeft,
      };
    });
}
