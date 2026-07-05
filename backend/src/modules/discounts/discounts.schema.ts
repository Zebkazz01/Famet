import { z } from "zod";

export const DISCOUNT_TYPES = ["QUANTITY_THRESHOLD", "PERCENTAGE", "BUY_X_GET_Y", "FIXED_AMOUNT"] as const;

const configSchemas = {
  QUANTITY_THRESHOLD: z.object({
    minQty: z.number().positive(),
    discountPct: z.number().min(0).max(100),
  }),
  PERCENTAGE: z.object({
    pct: z.number().min(0).max(100),
  }),
  BUY_X_GET_Y: z.object({
    buy: z.number().int().positive(),
    get: z.number().int().positive(),
    freePct: z.number().min(0).max(100).optional().default(100),
  }),
  FIXED_AMOUNT: z.object({
    amount: z.number().positive(),
    perLine: z.boolean().optional().default(false),
  }),
};

export const createRuleSchema = z.object({
  productId: z.number().int().positive(),
  type: z.enum(DISCOUNT_TYPES),
  config: z.record(z.any()),
  active: z.boolean().optional().default(true),
  validFrom: z.string().optional().nullable(),
  validTo: z.string().optional().nullable(),
  priority: z.number().int().optional().default(0),
}).superRefine((data, ctx) => {
  const schema = configSchemas[data.type];
  if (schema) {
    const result = schema.safeParse(data.config);
    if (!result.success) {
      for (const issue of result.error.issues) {
        ctx.addIssue({ ...issue, path: ["config", ...issue.path] });
      }
    }
  }
});

export const updateRuleSchema = z.object({
  type: z.enum(DISCOUNT_TYPES).optional(),
  config: z.record(z.any()).optional(),
  active: z.boolean().optional(),
  validFrom: z.string().optional().nullable(),
  validTo: z.string().optional().nullable(),
  priority: z.number().int().optional(),
});

export const previewSchema = z.object({
  items: z.array(z.object({
    productId: z.number().int().positive(),
    quantity: z.number().positive(),
    unitPrice: z.number().nonnegative(),
  })),
});

export type CreateRuleInput = z.infer<typeof createRuleSchema>;
export type UpdateRuleInput = z.infer<typeof updateRuleSchema>;
export type PreviewInput = z.infer<typeof previewSchema>;
