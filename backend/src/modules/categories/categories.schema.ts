import { z } from "zod";

export const COOKING_METHODS = [
  "ASAR",
  "FREIR",
  "SUDAR",
  "SOPA",
  "GUISAR",
  "PLANCHA",
  "CRUDO",
  "AHUMAR",
  "OTRO",
] as const;

export const ANIMAL_TYPES = [
  "RES",
  "CERDO",
  "POLLO",
  "PESCADO",
  "CORDERO",
  "CABRA",
  "MARISCO",
  "OTRO",
] as const;

export const createCategorySchema = z.object({
  name: z.string().min(1, "Nombre requerido"),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default("#3B82F6"),
  description: z.string().optional().nullable(),
  cookingMethods: z.array(z.enum(COOKING_METHODS)).optional().default([]),
  animalType: z.enum(ANIMAL_TYPES).optional().nullable(),
  animalPart: z.string().optional().nullable(),
  parentId: z.number().int().positive().optional().nullable(),
});

export const updateCategorySchema = createCategorySchema.partial();

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
