import { z } from "zod";

export const updateConfigSchema = z.record(
  z.string(),
  z.union([z.string(), z.number(), z.boolean(), z.null()]).transform((v) => v === null ? "" : String(v)),
);

export type UpdateConfigInput = z.infer<typeof updateConfigSchema>;

export const CONFIG_VERSION_KEYS = {
  logo: "logo_version",
  config: "config_version",
} as const;

export const PUBLIC_CONFIG_KEYS = [
  "business_name",
  "business_logo",
  "business_address",
  "business_phone",
  "accent_color",
  "logo_version",
  "config_version",
] as const;
