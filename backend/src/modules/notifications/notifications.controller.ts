import { Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../../config/database";
import { listQuerySchema, patchSchema, createSchema } from "./notifications.schema";
import * as notificationService from "./notificationService";

const DEFAULT_LIMIT = 30;
const MAX_LIMIT = 100;

export async function list(req: Request, res: Response) {
  const parsed = listQuerySchema.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: "Query inválido", details: parsed.error.errors });
  const { filter = "all", type, q, cursor, limit, from, to, sort = "newest", scope = "mine", userId: targetUserId } = parsed.data;
  const lim = Math.min(MAX_LIMIT, Math.max(1, Number(limit) || DEFAULT_LIMIT));
  const userId = req.user!.userId;
  const isAdmin = req.user!.role === "ADMIN";

  const where: Prisma.NotificationWhereInput = {};

  // Scope: ADMIN puede ver TODAS o filtrar por usuario específico; otros solo las suyas + globales
  if (isAdmin && scope === "all") {
    if (targetUserId) {
      where.userId = Number(targetUserId);
    }
    // else: sin filtro userId → todas
  } else {
    where.OR = [{ userId }, { userId: null }];
  }

  if (filter === "unread") {
    where.read = false;
    where.archived = false;
    where.deleted = false;
  } else if (filter === "read") {
    where.read = true;
    where.archived = false;
    where.deleted = false;
  } else if (filter === "archived") {
    where.archived = true;
    where.deleted = false;
  } else if (filter === "deleted") {
    where.deleted = true;
  } else {
    where.deleted = false;
  }
  if (type) where.type = type;

  // Rango de fechas
  const createdRange: Prisma.DateTimeFilter = {};
  if (from) {
    const d = new Date(from);
    if (!isNaN(d.getTime())) createdRange.gte = d;
  }
  if (to) {
    const d = new Date(to);
    if (!isNaN(d.getTime())) {
      // Incluir todo el día final
      d.setHours(23, 59, 59, 999);
      createdRange.lte = d;
    }
  }
  if (Object.keys(createdRange).length > 0) where.createdAt = createdRange;

  if (q) {
    where.AND = [
      {
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { message: { contains: q, mode: "insensitive" } },
        ],
      },
    ];
  }

  const items = await prisma.notification.findMany({
    where,
    orderBy: { createdAt: sort === "oldest" ? "asc" : "desc" },
    take: lim + 1,
    ...(cursor ? { cursor: { id: Number(cursor) }, skip: 1 } : {}),
    ...(isAdmin && scope === "all"
      ? { include: { user: { select: { id: true, username: true, firstName: true, lastName: true, role: true } } } }
      : {}),
  });

  const hasMore = items.length > lim;
  const sliced = hasMore ? items.slice(0, lim) : items;
  const nextCursor = hasMore ? String(sliced[sliced.length - 1].id) : null;

  return res.json({ items: sliced, nextCursor });
}

export async function unreadCount(req: Request, res: Response) {
  const userId = req.user!.userId;
  const count = await prisma.notification.count({
    where: {
      OR: [{ userId }, { userId: null }],
      read: false,
      archived: false,
      deleted: false,
    },
  });
  return res.json({ count });
}

export async function patch(req: Request, res: Response) {
  const id = Number(req.params.id);
  const parsed = patchSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Body inválido", details: parsed.error.errors });
  const userId = req.user!.userId;

  const existing = await prisma.notification.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ error: "Notificación no encontrada" });
  if (existing.userId !== null && existing.userId !== userId) {
    return res.status(403).json({ error: "Sin permisos" });
  }

  const data: Prisma.NotificationUpdateInput = {};
  if (parsed.data.read !== undefined) {
    data.read = parsed.data.read;
    data.readAt = parsed.data.read ? new Date() : null;
  }
  if (parsed.data.archived !== undefined) data.archived = parsed.data.archived;
  if (parsed.data.deleted !== undefined) data.deleted = parsed.data.deleted;

  const updated = await prisma.notification.update({ where: { id }, data });
  return res.json(updated);
}

export async function markAllRead(req: Request, res: Response) {
  const userId = req.user!.userId;
  const result = await prisma.notification.updateMany({
    where: {
      OR: [{ userId }, { userId: null }],
      read: false,
      deleted: false,
    },
    data: { read: true, readAt: new Date() },
  });
  return res.json({ updated: result.count });
}

export async function remove(req: Request, res: Response) {
  const id = Number(req.params.id);
  const userId = req.user!.userId;
  const existing = await prisma.notification.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ error: "No encontrada" });
  if (existing.userId !== null && existing.userId !== userId) {
    return res.status(403).json({ error: "Sin permisos" });
  }
  // Hard delete solo si está en papelera
  if (!existing.deleted) {
    return res.status(400).json({ error: "Solo se pueden eliminar notificaciones de la papelera. Muévela a papelera primero." });
  }
  await prisma.notification.delete({ where: { id } });
  return res.json({ message: "Eliminada permanentemente" });
}

export async function create(req: Request, res: Response) {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Body inválido", details: parsed.error.errors });
  const created = await notificationService.create(parsed.data);
  return res.status(201).json(created);
}
