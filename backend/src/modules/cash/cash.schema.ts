import { z } from "zod";

export const createCashMovementSchema = z.object({
  type: z.enum(["CASH_IN", "CASH_OUT"]),
  amount: z.number().positive("El monto debe ser mayor a 0"),
  reason: z.string().min(1, "El motivo es obligatorio"),
});

export type CreateCashMovementInput = z.infer<typeof createCashMovementSchema>;

export const createCashClosingSchema = z.object({
  expectedAmount: z.number().min(0, "El monto esperado no puede ser negativo"),
  actualAmount: z.number().min(0, "El monto real no puede ser negativo"),
  notes: z.string().optional(),
});

export type CreateCashClosingInput = z.infer<typeof createCashClosingSchema>;
