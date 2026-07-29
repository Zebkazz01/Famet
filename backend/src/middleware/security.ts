import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { Express } from "express";

export function setupSecurity(app: Express) {
  // Helmet: headers de seguridad HTTP
  // CSP configurado para permitir inline scripts (theme init), Google Fonts y WebSocket
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
          fontSrc: ["'self'", "https://fonts.gstatic.com"],
          imgSrc: ["'self'", "data:", "blob:"],
          connectSrc: ["'self'", "ws:", "wss:"],
          manifestSrc: ["'self'"],
        },
      },
    })
  );

  // Rate limiting global (100 req / 15 min por IP)
  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 200,
      standardHeaders: true,
      legacyHeaders: false,
      message: { error: "Demasiadas peticiones, intenta de nuevo más tarde." },
    })
  );

  // Rate limiting más estricto para login (10 intentos / 15 min)
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Demasiados intentos de login, espera 15 minutos." },
  });
  app.use("/api/auth", authLimiter);
}
