import { z } from "zod";

export const createProductSchema = z.object({
  name: z.string().min(1, "Nombre requerido"),
  sku: z.string().optional().nullable(),
  barcode: z.string().optional().nullable(),
  saleType: z.enum(["WEIGHT", "UNIT", "BOTH"]),
  price: z.number().positive("Precio debe ser mayor a 0"),
  cost: z.number().positive().optional().nullable(),
  stockQty: z.number().min(0).default(0),
  minStock: z.number().min(0).default(0),
  categoryId: z.number().int().positive(),
});

export const updateProductSchema = createProductSchema.partial();

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
