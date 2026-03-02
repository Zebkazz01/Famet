import { z } from "zod";
import dotenv from "dotenv";
import path from "path";

// Cargar .env local (backend/) primero, luego el de la raíz como fallback
dotenv.config({ path: path.resolve(__dirname, "../../.env") });
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

const envSchema = z.object({
  DATABASE_URL: z.string(),
  JWT_SECRET: z.string().min(10),
  JWT_EXPIRES_IN: z.string().default("8h"),
  PORT: z.coerce.number().default(3001),
  SCALE_PORT: z.string().default("COM3"),
  SCALE_BAUD_RATE: z.coerce.number().default(9600),
  BUSINESS_NAME: z.string().default("FAMEAT"),
  BUSINESS_ADDRESS: z.string().default(""),
  BUSINESS_PHONE: z.string().default(""),
});

export const env = envSchema.parse(process.env);
