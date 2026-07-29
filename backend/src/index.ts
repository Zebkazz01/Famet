import express from "express";
import cors from "cors";
import { createServer } from "http";
import { createServer as createHttpsServer } from "https";
import fs from "fs";
import { Server as SocketServer } from "socket.io";
import jwt from "jsonwebtoken";
import { env } from "./config/env";
import { errorHandler } from "./middleware/errorHandler";
import { setupSwagger } from "./config/swagger";
import { setupSecurity } from "./middleware/security";
import { requestLogger } from "./middleware/requestLogger";
import { ScaleManager } from "./scale/scaleManager";
import { setupScaleSocket } from "./scale/scaleSocket";
import { log, printBanner, printRoutes, printScaleStatus, printDbStatus, printShutdown } from "./config/logger";
import os from "os";

// Rutas
import authRoutes from "./modules/auth/auth.routes";
import usersRoutes from "./modules/users/users.routes";
import categoriesRoutes from "./modules/categories/categories.routes";
import productsRoutes from "./modules/products/products.routes";
import salesRoutes from "./modules/sales/sales.routes";
import ticketsRoutes from "./modules/tickets/tickets.routes";
import inventoryRoutes from "./modules/inventory/inventory.routes";
import cashRoutes from "./modules/cash/cash.routes";
import dashboardRoutes from "./modules/dashboard/dashboard.routes";
import suppliersRoutes from "./modules/suppliers/suppliers.routes";
import configRoutes, { manifestHandler } from "./modules/config/config.routes";
import notificationsRoutes from "./modules/notifications/notifications.routes";
import barcodesRoutes from "./modules/barcodes/barcodes.routes";
import productBatchRoutes, { expiryGeneralRouter } from "./modules/expiry/expiry.routes";
import expensesRoutes from "./modules/expenses/expenses.routes";
import discountRoutes, { productDiscountRulesRouter } from "./modules/discounts/discounts.routes";
import reportsRoutes from "./modules/reports/reports.routes";
import preferencesRoutes from "./modules/preferences/preferences.routes";
import animalPartsRoutes from "./modules/animalParts/animalParts.routes";
import customersRoutes from "./modules/customers/customers.routes";
import purchaseOrdersRoutes from "./modules/purchaseOrders/purchaseOrders.routes";
import processingRoutes from "./modules/processing/processing.routes";
import { authenticate, authorize } from "./middleware/auth";
import { setIO } from "./realtime/socketRegistry";
import * as cronManager from "./jobs/cronManager";
import * as configCache from "./utils/configCache";
import { registerLowStockJob } from "./jobs/lowStockCheckJob";
import { registerNotificationCleanupJob } from "./jobs/notificationCleanupJob";
import { registerExpiryCheckJob } from "./jobs/expiryCheckJob";
import { registerBackupJob, runBackup, restoreBackup, listBackups } from "./jobs/backupJob";
import { uploadsDir as resolveUploadsDir, backupsDir } from "./utils/paths";

const startTime = Date.now();

// Flags de estado del servidor — el health endpoint los usa en vez de consultar BD
let dbConnected = false;
let dbInitialized = false;
let serverReady = false;
let dbError: string | null = null;

const app = express();

// HTTPS opcional: si HTTPS=true y existen cert.pem + key.pem (en frontend/ por defecto),
// arranca con TLS. Útil para PWA + cámara desde LAN. Default: HTTP.
const path = require("path");
const httpsEnabled = process.env.HTTPS === "true";
const certPath = process.env.SSL_CERT || path.join(__dirname, "..", "..", "frontend", "cert.pem");
const keyPath = process.env.SSL_KEY || path.join(__dirname, "..", "..", "frontend", "key.pem");

const httpServer = httpsEnabled && fs.existsSync(certPath) && fs.existsSync(keyPath)
  ? createHttpsServer({ cert: fs.readFileSync(certPath), key: fs.readFileSync(keyPath) }, app)
  : createServer(app);

if (httpsEnabled && !(fs.existsSync(certPath) && fs.existsSync(keyPath))) {
  log.warn(`[server] HTTPS=true pero no se encontraron certs en ${certPath}. Arrancando con HTTP.`);
}

const io = new SocketServer(httpServer, {
  cors: { origin: "*" },
});

// Middleware global
app.use(cors());
app.use(express.json());

// Log solo de requests críticos (auth, errores, escrituras)
app.use((req, res, next) => {
  if (req.path.startsWith("/api")) {
    const isWrite = ["POST", "PUT", "DELETE", "PATCH"].includes(req.method);
    const isAuth = req.path.startsWith("/api/auth");
    if (isWrite || isAuth) {
      log.info(`${req.method.padEnd(6)} ${req.path}`);
    }
  }
  next();
});

// Health check (público, sin auth) - usado por POS-loader.ps1 y frontend
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    database: dbConnected,
    initialized: dbInitialized,
    ready: serverReady,
    scale: scaleManager.connected,
    uptime: Math.floor(process.uptime()),
    dbError,
  });
});

// Info de red para conexión desde el celular
app.get("/api/network", (_req, res) => {
  const interfaces = os.networkInterfaces();
  let ip = "127.0.0.1";
  for (const iface of Object.values(interfaces)) {
    if (!iface) continue;
    for (const addr of iface) {
      if (addr.family === "IPv4" && !addr.internal) {
        ip = addr.address;
        break;
      }
    }
    if (ip !== "127.0.0.1") break;
  }
  res.json({
    ip,
    port: env.PORT,
    protocol: httpsEnabled && fs.existsSync(certPath) && fs.existsSync(keyPath) ? "https" : "http",
    hostname: os.hostname(),
  });
});

// Security headers + rate limiting
setupSecurity(app);

// Request logging
app.use(requestLogger);

// API Docs (Swagger)
setupSwagger(app);

// Rutas API
app.use("/api/auth", authRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/categories", categoriesRoutes);
app.use("/api/products", productsRoutes);
app.use("/api/sales", salesRoutes);
app.use("/api/sales", ticketsRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/cash", cashRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/suppliers", suppliersRoutes);
app.use("/api/config", configRoutes);
app.use("/api/notifications", notificationsRoutes);
app.use("/api/barcodes", barcodesRoutes);
app.use("/api/products", productBatchRoutes);
app.use("/api/products", productDiscountRulesRouter);
app.use("/api", expiryGeneralRouter);
app.use("/api/expenses", expensesRoutes);
app.use("/api/discount-rules", discountRoutes);
app.use("/api/reports", reportsRoutes);
app.use("/api/preferences", preferencesRoutes);
app.use("/api/animal-parts", animalPartsRoutes);
app.use("/api/customers", customersRoutes);
app.use("/api/purchase-orders", purchaseOrdersRoutes);
app.use("/api/processing", processingRoutes);
app.get("/api/manifest.json", (req, res) => { Promise.resolve(manifestHandler(req, res)).catch(() => res.status(500).json({ error: "Error" })); });

// Servir imágenes (logo, productos, gastos). Path absoluto independiente del cwd.
app.use("/uploads", express.static(resolveUploadsDir()));

// Rutas de la balanza (REST)
const scaleManager = new ScaleManager(env.SCALE_PORT, env.SCALE_BAUD_RATE);

app.get("/api/scale/ports", authenticate, authorize("ADMIN"), async (_req, res) => {
  try {
    const ports = await ScaleManager.listPorts();
    res.json(ports);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/scale/connect", authenticate, authorize("ADMIN"), async (req, res) => {
  const { port, baudRate } = req.body;
  if (port) scaleManager.updateConfig(port, baudRate || env.SCALE_BAUD_RATE);
  try {
    await scaleManager.connect();
    // Persistir puerto + baud en BD para sobrevivir reinicios
    try {
      if (port) await configCache.set("scale_port", port);
      if (baudRate) await configCache.set("scale_baud_rate", String(baudRate));
    } catch {}
    res.json({ message: "Conectado a la balanza", connected: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message, connected: false });
  }
});

app.post("/api/scale/disconnect", authenticate, authorize("ADMIN"), async (_req, res) => {
  try {
    await scaleManager.disconnect();
    res.json({ message: "Desconectado", connected: false });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Auto-detecta puerto y reconecta. Sirve para hot-plug: usuario desconecto
 * la balanza y la conecto en otro puerto USB.
 */
app.post("/api/scale/reconnect", authenticate, async (_req, res) => {
  try {
    await scaleManager.disconnect();
  } catch {}
  let detected: string | null = null;
  try {
    detected = await ScaleManager.findScalePort();
  } catch {}
  const targetPort = detected || env.SCALE_PORT;
  scaleManager.setPort(targetPort);
  try {
    await scaleManager.connect();
    res.json({
      message: `Reconectada en ${targetPort}`,
      connected: true,
      port: targetPort,
      autoDetected: !!detected,
    });
  } catch (err: any) {
    const ports = await ScaleManager.listPorts().catch(() => []);
    res.status(500).json({
      error: err.message || "No se pudo reconectar",
      connected: false,
      port: targetPort,
      availablePorts: ports,
    });
  }
});

app.get("/api/scale/status", authenticate, (_req, res) => {
  res.json({
    connected: scaleManager.connected,
    processor: scaleManager.getProcessorConfig(),
    tareOffset: scaleManager.processor.getTareOffset(),
    tareActive: scaleManager.processor.getTareOffset() !== 0,
  });
});

// Tare por software
app.post("/api/scale/tare", authenticate, (_req, res) => {
  const offset = scaleManager.tare();
  res.json({ message: "Tare aplicado", offset, active: true });
});

app.post("/api/scale/tare/clear", authenticate, (_req, res) => {
  scaleManager.clearTare();
  res.json({ message: "Tare removido", offset: 0, active: false });
});

// Cambiar unidad de visualización
app.post("/api/scale/unit", authenticate, (req, res) => {
  const { unit } = req.body;
  if (!["kg", "lb", "g"].includes(unit)) {
    return res.status(400).json({ error: "Unidad inválida. Usa: kg, lb, g" });
  }
  scaleManager.setUnit(unit);
  res.json({ message: `Unidad de visualización cambiada a ${unit}`, unit });
});

// Cambiar unidad de entrada de la balanza (según botón físico kg/lb)
app.post("/api/scale/input-unit", authenticate, (req, res) => {
  const { unit } = req.body;
  if (!["kg", "lb", "g"].includes(unit)) {
    return res.status(400).json({ error: "Unidad inválida. Usa: kg, lb, g" });
  }
  scaleManager.setInputUnit(unit);
  res.json({ message: `Unidad de entrada de balanza: ${unit}`, inputUnit: unit });
});

// Obtener/Actualizar configuración del procesador
app.get("/api/scale/processor", authenticate, (_req, res) => {
  res.json(scaleManager.getProcessorConfig());
});

app.put("/api/scale/processor", authenticate, authorize("ADMIN"), async (req, res) => {
  const { inputUnit, unit, minWeight, stabilityCount, stabilityTolerance, averageSamples } = req.body;
  const updates: any = {};
  if (inputUnit && ["kg", "lb", "g"].includes(inputUnit)) updates.inputUnit = inputUnit;
  if (unit && ["kg", "lb", "g"].includes(unit)) updates.unit = unit;
  if (minWeight !== undefined) updates.minWeight = Number(minWeight);
  if (stabilityCount !== undefined) updates.stabilityCount = Number(stabilityCount);
  if (stabilityTolerance !== undefined) updates.stabilityTolerance = Number(stabilityTolerance);
  if (averageSamples !== undefined) updates.averageSamples = Number(averageSamples);
  scaleManager.updateProcessorConfig(updates);
  // Persistir en BD para sobrevivir reinicios/desconexiones
  try {
    await configCache.set("scale_processor_config", JSON.stringify(scaleManager.getProcessorConfig()));
  } catch (e: any) {
    log.warn(`[scale] no se pudo guardar config en BD: ${e.message}`);
  }
  res.json({ message: "Procesador actualizado", config: scaleManager.getProcessorConfig() });
});

// Reset procesador (limpia tare + buffers)
app.post("/api/scale/reset", authenticate, (_req, res) => {
  scaleManager.resetProcessor();
  res.json({ message: "Procesador reseteado" });
});

// === Backups ===
app.post("/api/backup/run", authenticate, authorize("ADMIN"), async (_req, res) => {
  try {
    const result = await runBackup();
    res.json({ message: "Backup completado", ...result });
  } catch (e: any) {
    res.status(500).json({ error: e.message || "Error en backup" });
  }
});

app.get("/api/backup/list", authenticate, authorize("ADMIN"), (_req, res) => {
  try {
    res.json(listBackups());
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

/**
 * PELIGROSO: restaura un backup sobre la BD actual.
 * Genera un backup de seguridad automáticamente antes.
 * Body: { fileName: string, dropFirst?: boolean }
 */
app.post("/api/backup/restore", authenticate, authorize("ADMIN"), async (req, res) => {
  const fileName = String(req.body?.fileName || "").trim();
  const dropFirst = !!req.body?.dropFirst;
  if (!fileName) return res.status(400).json({ error: "fileName requerido" });
  if (fileName.includes("..") || fileName.includes("/") || fileName.includes("\\")) {
    return res.status(400).json({ error: "fileName inválido" });
  }
  try {
    const result = await restoreBackup(fileName, { dropFirst });
    res.json({ message: "Restauración completada", ...result });
  } catch (e: any) {
    res.status(500).json({ error: e.message || "Error en restore" });
  }
});

// Servir frontend estático en producción (single-process deploy)
// Setear FRONTEND_DIST=ruta/al/build (default: ../frontend/dist)
if (process.env.SERVE_FRONTEND !== "false") {
  const path = require("path");
  const fs = require("fs");
  const frontendDist = path.resolve(
    process.env.FRONTEND_DIST || path.join(__dirname, "..", "..", "frontend", "dist"),
  );
  if (fs.existsSync(frontendDist)) {
    app.use(express.static(frontendDist, {
      index: false,
      setHeaders(res, filePath) {
        if (/\/assets\/.*\.[a-f0-9]{8}\.(js|css)$/i.test(filePath)) {
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        } else {
          res.setHeader('Cache-Control', 'no-cache, must-revalidate');
        }
      },
    }));
    // SPA catch-all: solo para navegacion (no assets, no api, no uploads, no socket)
    app.get(/^\/(?!api|uploads|socket\.io|assets\/).*/, (_req, res) => {
      res.sendFile(path.join(frontendDist, "index.html"));
    });
    log.info(`[server] sirviendo frontend desde ${frontendDist}`);
  }
}

// Error handler
app.use(errorHandler);

// Socket.IO para balanza
setupScaleSocket(io, scaleManager);

// Registrar io global para emisiones cross-módulo
setIO(io);

// Auth opcional en sockets para asignar rooms user:{id} y role:{role}
io.on("connection", (socket) => {
  const token = (socket.handshake.auth?.token || socket.handshake.query?.token) as string | undefined;
  if (!token) return;
  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as { userId: number; role: string };
    socket.join(`user:${payload.userId}`);
    if (payload.role) socket.join(`role:${payload.role}`);
  } catch {
    // Token inválido — socket sin rooms, solo recibe broadcasts
  }
});

// Iniciar servidor
httpServer.listen(env.PORT, async () => {
  printBanner(startTime);
  const proto = httpsEnabled && fs.existsSync(certPath) && fs.existsSync(keyPath) ? "https" : "http";
  log.info(`[server] escuchando en ${proto}://0.0.0.0:${env.PORT}`);
  printRoutes();

  // Verificar conexión a base de datos
  const dbStart = Date.now();
  try {
    const { prisma } = await import("./config/database");
    await prisma.$queryRaw`SELECT 1`;
    dbConnected = true;
    const userCount = await prisma.user.count();
    dbInitialized = userCount > 0;
    printDbStatus(true, Date.now() - dbStart);
    // Precargar config cache
    try { await configCache.ensureLoaded(); } catch {}
    // Restaurar config persistida de la balanza (sobrevive reinicios y desconexiones)
    try {
      const saved = configCache.get("scale_processor_config");
      if (saved) {
        const parsed = JSON.parse(saved);
        scaleManager.updateProcessorConfig(parsed);
        log.info("[scale] config procesador restaurada desde BD");
      }
    } catch (e: any) {
      log.warn(`[scale] no se pudo restaurar config procesador: ${e.message}`);
    }
    // Registrar y arrancar cron jobs
    registerLowStockJob();
    registerNotificationCleanupJob();
    registerExpiryCheckJob();
    registerBackupJob();
    cronManager.start();
  } catch (e: any) {
    dbConnected = false;
    dbError = (e as Error).message;
    printDbStatus(false, Date.now() - dbStart);
    log.error(dbError);
  }

  serverReady = true;

  // Auto-detectar puerto balanza por VID/PID conocidos.
  // Prioridad: 1) auto-detect, 2) BD (scale_port guardado), 3) env.SCALE_PORT
  const savedPort = configCache.get("scale_port");
  const savedBaud = configCache.get("scale_baud_rate");
  const baudFinal = savedBaud ? Number(savedBaud) : env.SCALE_BAUD_RATE;
  let scalePath = env.SCALE_PORT;
  if (process.env.SCALE_AUTODETECT !== "false") {
    try {
      const detected = await ScaleManager.findScalePort();
      if (detected) {
        scalePath = detected;
        log.info(`[scale] balanza detectada automaticamente en ${detected}`);
      } else if (savedPort) {
        scalePath = savedPort;
        log.info(`[scale] usando puerto guardado: ${savedPort}`);
      } else {
        log.warn(`[scale] no se detecto balanza por VID/PID, usando puerto de env: ${env.SCALE_PORT}`);
      }
    } catch (e: any) {
      log.warn(`[scale] auto-detect fallo, usando puerto guardado/env: ${e.message}`);
      if (savedPort) scalePath = savedPort;
    }
  } else if (savedPort) {
    scalePath = savedPort;
  }
  scaleManager.setPort(scalePath);
  if (savedPort || savedBaud) {
    scaleManager.updateConfig(scalePath, baudFinal);
  }
  const scaleDisabled = configCache.get("scale_disabled") === "true";
  if (scaleDisabled) {
    log.info("[scale] balanza deshabilitada por configuracion global");
  } else {
    log.info(`Conectando balanza en ${scalePath}...`);
    scaleManager.connect()
      .then(() => printScaleStatus(true))
      .catch((err) => printScaleStatus(false, err.message));
  }
});

// Evita que unhandled rejections tiren toda la app
process.on("unhandledRejection", (reason) => {
  log.error(`[process] unhandledRejection: ${reason}`);
});

// Graceful shutdown
process.on("SIGINT", () => {
  printShutdown();
  cronManager.stop();
  scaleManager.disconnect().then(() => {
    log.ok("Balanza desconectada");
    httpServer.close(() => {
      log.ok("Servidor cerrado");
      process.exit(0);
    });
  });
});

process.on("SIGTERM", () => {
  printShutdown();
  cronManager.stop();
  process.exit(0);
});
