import { z } from "zod";

const itemSchema = z.object({
  productId: z.number().int().positive(),
  quantityOrdered: z.number().positive(),
  unitCost: z.number().nonnegative(),
  notes: z.string().optional().nullable(),
});

export const createOrderSchema = z.object({
  supplierId: z.number().int().positive(),
  expectedDate: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  tax: z.number().nonnegative().optional().default(0),
  items: z.array(itemSchema).min(1, "Mínimo 1 producto"),
});

export const updateOrderSchema = z.object({
  expectedDate: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  tax: z.number().nonnegative().optional(),
  status: z.enum(["DRAFT", "SENT", "PARTIAL", "RECEIVED", "CANCELLED"]).optional(),
  items: z.array(itemSchema).optional(),
});

const receiveItemSchema = z.object({
  itemId: z.number().int().positive(),
  quantityReceived: z.number().nonnegative(),
});

export const receiveSchema = z.object({
  items: z.array(receiveItemSchema).min(1),
  notes: z.string().optional().nullable(),
  attachment: z.string().optional().nullable(),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type UpdateOrderInput = z.infer<typeof updateOrderSchema>;
export type ReceiveInput = z.infer<typeof receiveSchema>;
