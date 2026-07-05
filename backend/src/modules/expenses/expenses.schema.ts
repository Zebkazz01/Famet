import { z } from "zod";

const paymentMethods = ["CASH", "CARD", "TRANSFER"] as const;

export const createExpenseSchema = z.object({
  amount: z.coerce.number().positive("Monto debe ser > 0"),
  description: z.string().min(1, "Descripción requerida"),
  category: z.string().min(1, "Categoría requerida"),
  date: z.string().min(1, "Fecha requerida"),
  paymentMethod: z.enum(paymentMethods).optional().nullable(),
});

export const updateExpenseSchema = createExpenseSchema.partial();

export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
export type UpdateExpenseInput = z.infer<typeof updateExpenseSchema>;
