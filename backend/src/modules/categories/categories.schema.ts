import { z } from "zod";

export const createCategorySchema = z.object({
  name: z.string().min(1, "Nombre requerido"),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default("#3B82F6"),
});

export const updateCategorySchema = createCategorySchema.partial();

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
