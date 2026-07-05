import { NotificationType, Prisma } from "@prisma/client";
import { prisma } from "../../config/database";
import { emitBroadcast, emitToUser, emitToRole } from "../../realtime/socketRegistry";

export interface CreateNotificationInput {
  userId?: number | null;
  role?: "ADMIN" | "SUPERVISOR" | "VENDEDOR" | null;
  type: NotificationType;
  title: string;
  message: string;
  link?: string | null;
  metadata?: Record<string, unknown> | null;
}

/**
 * Crea notificación y la emite por Socket.IO al destinatario apropiado.
 * Si userId != null → emite a `user:{id}`. Si null + role → `role:{R}`. Si ambos null → broadcast.
 */
export async function create(input: CreateNotificationInput) {
  const data: Prisma.NotificationCreateInput = {
    type: input.type,
    title: input.title,
    message: input.message,
    link: input.link ?? null,
    metadata: (input.metadata as Prisma.InputJsonValue | undefined) ?? Prisma.JsonNull,
    ...(input.userId ? { user: { connect: { id: input.userId } } } : {}),
  };
  const created = await prisma.notification.create({ data });

  if (input.userId) {
    emitToUser(input.userId, "notification:new", created);
  } else if (input.role) {
    emitToRole(input.role, "notification:new", created);
  } else {
    emitBroadcast("notification:new", created);
  }
  return created;
}

/**
 * Crea notificación idempotente para alertas automáticas (evita spam).
 * Clave: (type, metadata.productId opcional, fecha actual).
 * Si ya existe una hoy con la misma clave, no crea otra.
 */
export async function createIdempotent(
  input: CreateNotificationInput,
  key: { productId?: number; extraKey?: string },
) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  const where: Prisma.NotificationWhereInput = {
    type: input.type,
    createdAt: { gte: start, lt: end },
    deleted: false,
  };
  if (input.userId !== undefined && input.userId !== null) where.userId = input.userId;
  if (key.productId !== undefined) {
    where.metadata = { path: ["productId"], equals: key.productId } as any;
  }

  const existing = await prisma.notification.findFirst({ where });
  if (existing) return existing;
  return await create(input);
}

export async function notifyLowStock(product: { id: number; name: string; stockQty: number | string; minStock: number | string }) {
  return await createIdempotent(
    {
      type: "STOCK",
      title: "Stock bajo",
      message: `${product.name} tiene ${product.stockQty} unidades (mín ${product.minStock})`,
      link: `/products?productId=${product.id}`,
      metadata: { productId: product.id, kind: "lowStock" },
    },
    { productId: product.id },
  );
}

export async function notifyExpiry(batch: { id: number; productId: number; productName: string; expiryDate: Date; daysLeft: number }) {
  const msg = batch.daysLeft <= 0
    ? `${batch.productName} VENCIDO`
    : `${batch.productName} vence en ${batch.daysLeft} día(s)`;
  return await createIdempotent(
    {
      type: "EXPIRY",
      title: batch.daysLeft <= 0 ? "Producto vencido" : "Por vencer",
      message: msg,
      link: `/products?productId=${batch.productId}`,
      metadata: { productId: batch.productId, batchId: batch.id, daysLeft: batch.daysLeft },
    },
    { productId: batch.productId },
  );
}
