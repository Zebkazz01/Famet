import cors from "cors";
import { createServer } from "http";
import { createServer as createHttpsServer } from "https";
import fs from "fs";
import path from "path";
import os from "os";
import { Server as SocketServer } from "socket.io";
import jwt from "jsonwebtoken";
import { env } from "./config/env";
import { app, scaleManager } from "./app";
import { setupScaleSocket } from "./scale/scaleSocket";
import { log, printBanner, printRoutes, printScaleStatus, printDbStatus, printShutdown } from "./config/logger";
import { ScaleManager } from "./scale/scaleManager";
import { setIO } from "./realtime/socketRegistry";
import * as cronManager from "./jobs/cronManager";
import * as configCache from "./utils/configCache";
import { registerLowStockJob } from "./jobs/lowStockCheckJob";
import { registerNotificationCleanupJob } from "./jobs/notificationCleanupJob";
import { registerExpiryCheckJob } from "./jobs/expiryCheckJob";
import { registerBackupJob } from "./jobs/backupJob";

const startTime = Date.now();

let dbConnected = false;
let dbInitialized = false;
let serverReady = false;
let dbError: string | null = null;

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

// Socket.IO para balanza y tiempo real
setupScaleSocket(io, scaleManager);
setIO(io);

io.on("connection", (socket) => {
  const token = (socket.handshake.auth?.token || socket.handshake.query?.token) as string | undefined;
  if (!token) return;
  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as { userId: number; role: string };
    socket.join(`user:${payload.userId}`);
    if (payload.role) socket.join(`role:${payload.role}`);
  } catch {
    // Token inválido — socket sin rooms
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

    try { await configCache.ensureLoaded(); } catch {}
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

process.on("unhandledRejection", (reason) => {
  log.error(`[process] unhandledRejection: ${reason}`);
});

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
