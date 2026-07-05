import { z } from "zod";

export const createCustomerSchema = z.object({
  name: z.string().min(1, "Nombre requerido"),
  phone: z.string().optional().nullable(),
  document: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  creditLimit: z.number().nonnegative().optional().default(0),
  discountPercent: z.number().min(0).max(100).optional().nullable(),
});

export const updateCustomerSchema = createCustomerSchema.partial().extend({
  active: z.boolean().optional(),
});

export const createPaymentSchema = z.object({
  customerId: z.number().int().positive(),
  saleId: z.number().int().positive().optional().nullable(),
  amount: z.number().positive("Monto > 0"),
  method: z.enum(["CASH", "CARD", "TRANSFER", "OTHER"]).default("CASH"),
  reference: z.string().optional().nullable(),
  evidence: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;
export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;
