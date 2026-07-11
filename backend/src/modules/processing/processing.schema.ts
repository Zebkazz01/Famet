import { z } from "zod";

const outputSchema = z.object({
  productId: z.number().int().positive(),
  weightKg: z.number().positive(),
  costPerKg: z.number().nonnegative().optional(),
  salePricePerKg: z.number().nonnegative().optional().nullable(),
});

export const createProcessingSchema = z.object({
  animalType: z.enum(["RES", "CERDO", "POLLO", "PESCADO", "CORDERO", "CABRA", "MARISCO", "OTRO"]),
  inputProductId: z.number().int().positive(),
  inputWeightKg: z.number().positive(),
  totalCost: z.number().nonnegative(),
  wasteWeightKg: z.number().nonnegative().optional().default(0),
  notes: z.string().optional().nullable(),
  outputs: z.array(outputSchema).min(1, "Mínimo 1 corte"),
});

export const updateProcessingSchema = z.object({
  animalType: z.enum(["RES", "CERDO", "POLLO", "PESCADO", "CORDERO", "CABRA", "MARISCO", "OTRO"]).optional(),
  inputWeightKg: z.number().positive().optional(),
  totalCost: z.number().nonnegative().optional(),
  wasteWeightKg: z.number().nonnegative().optional(),
  notes: z.string().optional().nullable(),
  outputs: z.array(outputSchema).min(1).optional(),
});

export type CreateProcessingInput = z.infer<typeof createProcessingSchema>;
export type UpdateProcessingInput = z.infer<typeof updateProcessingSchema>;
