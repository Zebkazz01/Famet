import { z } from "zod";

export const createBatchSchema = z.object({
  batchCode: z.string().optional().nullable(),
  expiryDate: z.string().min(1, "Fecha requerida"),
  qty: z.number().positive("Cantidad debe ser positiva"),
  notes: z.string().optional().nullable(),
});

export const updateBatchSchema = createBatchSchema.partial();

export type CreateBatchInput = z.infer<typeof createBatchSchema>;
export type UpdateBatchInput = z.infer<typeof updateBatchSchema>;
