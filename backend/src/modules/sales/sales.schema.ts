import { z } from "zod";

export const createSaleSchema = z.object({
  items: z.array(
    z.object({
      productId: z.number().int().positive(),
      quantity: z.number().positive("Cantidad debe ser mayor a 0"),
      unitPrice: z.number().positive(),
      isSubUnit: z.boolean().default(false),
      skipDiscount: z.boolean().optional(),
    })
  ).min(1, "Debe tener al menos un producto"),
  paymentMethod: z.enum(["CASH", "CARD", "TRANSFER"]),
  amountPaid: z.number().nonnegative("Monto pagado >= 0"),

  // Evidencia y confirmación pago electrónico
  paymentRef: z.string().optional().nullable(),       // referencia/voucher/aprobación banco
  paymentEvidence: z.string().optional().nullable(),  // ruta a imagen subida del comprobante
  paymentStatus: z.enum(["PENDING", "CONFIRMED", "FAILED"]).optional().default("CONFIRMED"),
  paymentNotes: z.string().optional().nullable(),

  // Crédito a cliente
  isCredit: z.boolean().optional().default(false),
  customerId: z.number().int().positive().optional().nullable(),
  dueDate: z.string().optional().nullable(),
});

export type CreateSaleInput = z.infer<typeof createSaleSchema>;

export const correctSaleSchema = z.object({
  correctionReason: z.string().min(1, "El motivo de corrección es obligatorio"),
});

export type CorrectSaleInput = z.infer<typeof correctSaleSchema>;

/** Edición permite 0 items (devolución total). */
export const updateSaleSchema = z.object({
  items: z.array(
    z.object({
      productId: z.number().int().positive(),
      quantity: z.number().positive(),
      unitPrice: z.number().positive(),
      isSubUnit: z.boolean().default(false),
    })
  ),
  paymentMethod: z.enum(["CASH", "CARD", "TRANSFER"]).optional(),
  amountPaid: z.number().nonnegative().optional(),
  correctionReason: z.string().optional(),
});

export type UpdateSaleInput = z.infer<typeof updateSaleSchema>;
