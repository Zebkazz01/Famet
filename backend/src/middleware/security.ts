import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { Express } from "express";

export function setupSecurity(app: Express): void {
  // Security headers
  app.use(helmet());

  // Global rate limiting: 100 requests per 15 minutes per IP
  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 100,
      standardHeaders: true,
      legacyHeaders: false,
      message: { error: "Demasiadas solicitudes. Intenta de nuevo en 15 minutos." },
    })
  );

  // Stricter rate limiting for auth endpoints: 10 requests per 15 minutes
  app.use(
    "/api/auth",
    rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 10,
      standardHeaders: true,
      legacyHeaders: false,
      message: { error: "Demasiados intentos de login. Espera 15 minutos." },
    })
  );
}
