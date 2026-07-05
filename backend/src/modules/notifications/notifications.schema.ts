import { z } from "zod";

export const NOTIFICATION_TYPES = ["INFO", "WARNING", "STOCK", "EXPIRY", "SALE", "SYSTEM"] as const;

export const listQuerySchema = z.object({
  filter: z.enum(["all", "unread", "read", "archived", "deleted"]).optional().default("all"),
  type: z.enum(NOTIFICATION_TYPES).optional(),
  q: z.string().optional(),
  cursor: z.string().optional(),
  limit: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  sort: z.enum(["newest", "oldest"]).optional().default("newest"),
  scope: z.enum(["mine", "all"]).optional().default("mine"),
  userId: z.string().optional(),
});

export const patchSchema = z.object({
  read: z.boolean().optional(),
  archived: z.boolean().optional(),
  deleted: z.boolean().optional(),
});

export const createSchema = z.object({
  userId: z.number().int().nullable().optional(),
  type: z.enum(NOTIFICATION_TYPES),
  title: z.string().min(1),
  message: z.string().min(1),
  link: z.string().optional().nullable(),
  metadata: z.record(z.unknown()).optional().nullable(),
});

export type PatchInput = z.infer<typeof patchSchema>;
export type CreateInput = z.infer<typeof createSchema>;
