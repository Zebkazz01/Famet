import express from "express";
import cors from "cors";
import { createServer } from "http";
import { Server as SocketServer } from "socket.io";
import { env } from "./config/env";
import { errorHandler } from "./middleware/errorHandler";
import { ScaleManager } from "./scale/scaleManager";
import { setupScaleSocket } from "./scale/scaleSocket";
import { log, printBanner, printRoutes, printScaleStatus, printDbStatus, printShutdown } from "./config/logger";

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
import { authenticate, authorize } from "./middleware/auth";

const startTime = Date.now();

const app = express();
const httpServer = createServer(app);
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

// Rutas de la balanza (REST)
const scaleManager = new ScaleManager(env.SCALE_PORT, env.SCALE_BAUD_RATE);

app.get("/api/scale/ports", authenticate, authorize("ADMIN"), async (_req, res) => {
  const ports = await ScaleManager.listPorts();
  res.json(ports);
});

app.post("/api/scale/connect", authenticate, authorize("ADMIN"), async (req, res) => {
  const { port, baudRate } = req.body;
  if (port) scaleManager.updateConfig(port, baudRate || env.SCALE_BAUD_RATE);
  try {
    await scaleManager.connect();
    res.json({ message: "Conectado a la balanza", connected: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message, connected: false });
  }
});

app.post("/api/scale/disconnect", authenticate, authorize("ADMIN"), async (_req, res) => {
  await scaleManager.disconnect();
  res.json({ message: "Desconectado", connected: false });
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

app.put("/api/scale/processor", authenticate, authorize("ADMIN"), (req, res) => {
  const { inputUnit, unit, minWeight, stabilityCount, stabilityTolerance, averageSamples } = req.body;
  const updates: any = {};
  if (inputUnit && ["kg", "lb", "g"].includes(inputUnit)) updates.inputUnit = inputUnit;
  if (unit && ["kg", "lb", "g"].includes(unit)) updates.unit = unit;
  if (minWeight !== undefined) updates.minWeight = Number(minWeight);
  if (stabilityCount !== undefined) updates.stabilityCount = Number(stabilityCount);
  if (stabilityTolerance !== undefined) updates.stabilityTolerance = Number(stabilityTolerance);
  if (averageSamples !== undefined) updates.averageSamples = Number(averageSamples);
  scaleManager.updateProcessorConfig(updates);
  res.json({ message: "Procesador actualizado", config: scaleManager.getProcessorConfig() });
});

// Reset procesador (limpia tare + buffers)
app.post("/api/scale/reset", authenticate, (_req, res) => {
  scaleManager.resetProcessor();
  res.json({ message: "Procesador reseteado" });
});

// Ruta de configuración del sistema
app.get("/api/config", authenticate, async (_req, res) => {
  const { prisma } = await import("./config/database");
  const configs = await prisma.systemConfig.findMany();
  const configMap: Record<string, string> = {};
  for (const c of configs) configMap[c.key] = c.value;
  res.json(configMap);
});

app.put("/api/config", authenticate, authorize("ADMIN"), async (req, res) => {
  const { prisma } = await import("./config/database");
  const entries = Object.entries(req.body) as [string, string][];
  for (const [key, value] of entries) {
    await prisma.systemConfig.upsert({
      where: { key },
      update: { value: String(value) },
      create: { key, value: String(value) },
    });
  }
  res.json({ message: "Configuración actualizada" });
});

// Error handler
app.use(errorHandler);

// Socket.IO para balanza
setupScaleSocket(io, scaleManager);

// Iniciar servidor
httpServer.listen(env.PORT, async () => {
  printBanner(startTime);
  printRoutes();

  // Verificar conexión a base de datos
  const dbStart = Date.now();
  try {
    const { prisma } = await import("./config/database");
    await prisma.$queryRaw`SELECT 1`;
    printDbStatus(true, Date.now() - dbStart);
  } catch (e: any) {
    printDbStatus(false, Date.now() - dbStart);
    log.error(e.message);
  }

  // Intentar conectar balanza
  log.info(`Conectando balanza en ${env.SCALE_PORT}...`);
  scaleManager.connect()
    .then(() => printScaleStatus(true))
    .catch((err) => printScaleStatus(false, err.message));
});

// Graceful shutdown
process.on("SIGINT", () => {
  printShutdown();
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
  process.exit(0);
});
