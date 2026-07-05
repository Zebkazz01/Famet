import { z } from "zod";

export const rangeSchema = z.object({
  from: z.string().min(1),
  to: z.string().min(1),
  format: z.enum(["json", "pdf", "xlsx"]).optional().default("json"),
  groupBy: z.enum(["day", "product", "category"]).optional(),
});

export const monthSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/, "Formato YYYY-MM"),
  format: z.enum(["json", "pdf", "xlsx"]).optional().default("json"),
});

export const closeMonthSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/, "Formato YYYY-MM"),
});

export type RangeInput = z.infer<typeof rangeSchema>;
export type MonthInput = z.infer<typeof monthSchema>;
export type CloseMonthInput = z.infer<typeof closeMonthSchema>;
