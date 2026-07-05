import { z } from "zod";

export const createProductSchema = z.object({
  name: z.string().min(1, "Nombre requerido"),
  sku: z.string().optional().nullable(),
  barcode: z.string().optional().nullable(),
  saleType: z.enum(["WEIGHT", "UNIT", "BOTH"]),
  price: z.number().positive("Precio debe ser mayor a 0"),
  cost: z.number().positive().optional().nullable(),
  bulkCost: z.number().positive().optional().nullable(),
  stockQty: z.number().min(0).default(0),
  minStock: z.number().min(0).default(0),
  categoryId: z.number().int().positive(),
  supplierId: z.number().int().positive().optional().nullable(),
  weightUnit: z.enum(["kg", "lb", "@"]).default("kg"),
  imageUrl: z.string().optional().nullable(),
  // Sub-unidades
  unitsPerPack: z.number().int().positive().optional().nullable(),
  subUnitName: z.string().min(1).optional().nullable(),
  subUnitPrice: z.number().positive().optional().nullable(),
  // Carne/pescado (opcional por producto)
  animalType: z.enum(["RES", "CERDO", "POLLO", "PESCADO", "CORDERO", "CABRA", "MARISCO", "OTRO"]).optional().nullable(),
  animalPart: z.string().optional().nullable(),
  cookingMethods: z.array(z.enum(["ASAR", "FREIR", "SUDAR", "SOPA", "GUISAR", "PLANCHA", "CRUDO", "AHUMAR", "OTRO"])).optional().default([]),
});

export const updateProductSchema = createProductSchema.partial().extend({
  active: z.boolean().optional(),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
