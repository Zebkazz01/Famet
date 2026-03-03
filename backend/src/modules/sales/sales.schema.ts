import { z } from "zod";

export const createSaleSchema = z.object({
  items: z.array(
    z.object({
      productId: z.number().int().positive(),
      quantity: z.number().positive("Cantidad debe ser mayor a 0"),
      unitPrice: z.number().positive(),
    })
  ).min(1, "Debe tener al menos un producto"),
  paymentMethod: z.enum(["CASH", "CARD", "TRANSFER"]),
  amountPaid: z.number().positive("Monto pagado debe ser mayor a 0"),
});

export type CreateSaleInput = z.infer<typeof createSaleSchema>;

export const correctSaleSchema = z.object({
  correctionReason: z.string().min(1, "El motivo de corrección es obligatorio"),
});

export type CorrectSaleInput = z.infer<typeof correctSaleSchema>;
