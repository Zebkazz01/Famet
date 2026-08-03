import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import os from "os";
import { env } from "./config/env";
import { errorHandler } from "./middleware/errorHandler";
import { setupSwagger } from "./config/swagger";
import { setupSecurity } from "./middleware/security";
import { requestLogger } from "./middleware/requestLogger";
import { ScaleManager } from "./scale/scaleManager";
import { log } from "./config/logger";

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
import * as configCache from "./utils/configCache";
import { runBackup, listBackups, restoreBackup } from "./jobs/backupJob";
import { uploadsDir as resolveUploadsDir } from "./utils/paths";

export const app = express();

// Instancia opcional de ScaleManager para endpoints REST
export const scaleManager = new ScaleManager(env.SCALE_PORT, env.SCALE_BAUD_RATE);

// Middleware global
app.use(cors());
app.use(express.json());

// Log de escrituras y auth
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

// Health check
app.get("/api/health", async (_req, res) => {
  let dbOk = true;
  let dbErr: string | null = null;
  let initialized = false;
  try {
    const { prisma } = await import("./config/database");
    await prisma.$queryRaw`SELECT 1`;
    initialized = (await prisma.user.count()) > 0;
  } catch (e: any) {
    dbOk = false;
    dbErr = e.message;
  }
  res.json({
    status: "ok",
    database: dbOk,
    initialized,
    ready: dbOk,
    scale: scaleManager.connected,
    uptime: Math.floor(process.uptime()),
    dbError: dbErr,
  });
});

// Network info
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
app.get("/api/manifest.json", manifestHandler);

// Servir imágenes
app.use("/uploads", express.static(resolveUploadsDir()));

// Rutas REST de la balanza
app.get("/api/scale/ports", authenticate, authorize("ADMIN"), async (_req, res) => {
  const ports = await ScaleManager.listPorts();
  res.json(ports);
});

app.post("/api/scale/connect", authenticate, authorize("ADMIN"), async (req, res) => {
  const { port, baudRate } = req.body;
  if (port) scaleManager.updateConfig(port, baudRate || env.SCALE_BAUD_RATE);
  try {
    await scaleManager.connect();
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
  await scaleManager.disconnect();
  res.json({ message: "Desconectado", connected: false });
});

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

app.post("/api/scale/tare", authenticate, (_req, res) => {
  const offset = scaleManager.tare();
  res.json({ message: "Tare aplicado", offset, active: true });
});

app.post("/api/scale/tare/clear", authenticate, (_req, res) => {
  scaleManager.clearTare();
  res.json({ message: "Tare removido", offset: 0, active: false });
});

app.post("/api/scale/unit", authenticate, (req, res) => {
  const { unit } = req.body;
  if (!["kg", "lb", "g"].includes(unit)) {
    return res.status(400).json({ error: "Unidad inválida. Usa: kg, lb, g" });
  }
  scaleManager.setUnit(unit);
  res.json({ message: `Unidad de visualización cambiada a ${unit}`, unit });
});

app.post("/api/scale/input-unit", authenticate, (req, res) => {
  const { unit } = req.body;
  if (!["kg", "lb", "g"].includes(unit)) {
    return res.status(400).json({ error: "Unidad inválida. Usa: kg, lb, g" });
  }
  scaleManager.setInputUnit(unit);
  res.json({ message: `Unidad de entrada de balanza: ${unit}`, inputUnit: unit });
});

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
  try {
    await configCache.set("scale_processor_config", JSON.stringify(scaleManager.getProcessorConfig()));
  } catch (e: any) {
    log.warn(`[scale] no se pudo guardar config en BD: ${e.message}`);
  }
  res.json({ message: "Procesador actualizado", config: scaleManager.getProcessorConfig() });
});

app.post("/api/scale/reset", authenticate, (_req, res) => {
  scaleManager.resetProcessor();
  res.json({ message: "Procesador reseteado" });
});

// Backups REST
app.post("/api/backup/run", authenticate, authorize("ADMIN"), async (_req, res) => {
  try {
    const result = await runBackup();
    res.json({ message: "Backup completado", ...result });
  } catch (e: any) {
    res.status(500).json({ error: e.message || "Error en backup" });
  }
});

app.get("/api/backup/list", authenticate, authorize("ADMIN"), (_req, res) => {
  res.json(listBackups());
});

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

// Servir frontend estático en desplegables o producción donde SERVE_FRONTEND !== "false"
if (process.env.SERVE_FRONTEND === "true") {
  const frontendDist = path.resolve(
    process.env.FRONTEND_DIST || path.join(__dirname, "..", "..", "frontend", "dist")
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
    app.get(/^\/(?!api|uploads|socket\.io|assets\/).*/, (_req, res) => {
      res.sendFile(path.join(frontendDist, "index.html"));
    });
  }
}

// Error handler
app.use(errorHandler);

export default app;
