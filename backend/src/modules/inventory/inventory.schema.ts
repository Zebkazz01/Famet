import { z } from "zod";

export const createMovementSchema = z.object({
  productId: z.number().int().positive(),
  type: z.enum(["ENTRY", "ADJUSTMENT", "LOSS", "RETURN"]),
  quantity: z.number().positive("Cantidad debe ser mayor a 0"),
  notes: z.string().optional().nullable(),
});

export type CreateMovementInput = z.infer<typeof createMovementSchema>;
