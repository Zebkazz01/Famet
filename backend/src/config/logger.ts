import pino from "pino";
import os from "os";
import { env } from "./env";

const isDev = process.env.NODE_ENV !== "production";

export const logger = pino({
  level: process.env.LOG_LEVEL || (isDev ? "debug" : "info"),
  transport: isDev
    ? { target: "pino-pretty", options: { colorize: true, translateTime: "HH:MM:ss" } }
    : undefined,
});

// Backward-compatible log interface (used by ~56 call sites)
export const log = {
  info: (msg: string) => logger.info(msg),
  ok: (msg: string) => logger.info({ msg, label: "OK" }),
  warn: (msg: string) => logger.warn(msg),
  error: (msg: string) => logger.error(msg),
  route: (method: string, path: string) => logger.debug({ method, path }, "route"),
};

export function printBanner(startTime: number) {
  const elapsed = Date.now() - startTime;

  console.log("");
  console.log("\x1b[31m\x1b[1m  ███████╗ █████╗ ███╗   ███╗███████╗ █████╗ ████████╗\x1b[0m");
  console.log("\x1b[31m\x1b[1m  ██╔════╝██╔══██╗████╗ ████║██╔════╝██╔══██╗╚══██╔══╝\x1b[0m");
  console.log("\x1b[31m\x1b[1m  █████╗  ███████║██╔████╔██║█████╗  ███████║   ██║   \x1b[0m");
  console.log("\x1b[31m\x1b[1m  ██╔══╝  ██╔══██║██║╚██╔╝██║██╔══╝  ██╔══██║   ██║   \x1b[0m");
  console.log("\x1b[31m\x1b[1m  ██║     ██║  ██║██║ ╚═╝ ██║███████╗██║  ██║   ██║   \x1b[0m");
  console.log("\x1b[31m\x1b[1m  ╚═╝     ╚═╝  ╚═╝╚═╝     ╚═╝╚══════╝╚═╝  ╚═╝   ╚═╝   \x1b[0m");
  console.log("\x1b[2m  Punto de Venta v1.3.0\x1b[0m");
  console.log("  \x1b[1m\x1b[35m[ BACKEND ]\x1b[0m");
  console.log("");
  console.log(`  Servidor listo en \x1b[1m${elapsed}ms\x1b[0m`);
  console.log("");

  let lanIp = "127.0.0.1";
  try {
    const ifaces = os.networkInterfaces();
    for (const iface of Object.values(ifaces)) {
      if (!iface) continue;
      for (const addr of iface) {
        if (addr.family === "IPv4" && !addr.internal) {
          lanIp = addr.address;
          break;
        }
      }
      if (lanIp !== "127.0.0.1") break;
    }
  } catch {}

  console.log("  \x1b[1mEndpoints\x1b[0m");
  console.log(`  \x1b[2m├─\x1b[0m Local:    \x1b[36m\x1b[1mhttp://localhost:${env.PORT}\x1b[0m`);
  console.log(`  \x1b[2m├─\x1b[0m Red:      \x1b[36m\x1b[1mhttp://${lanIp}:${env.PORT}\x1b[0m`);
  console.log(`  \x1b[2m├─\x1b[0m API:      \x1b[36mhttp://localhost:${env.PORT}/api\x1b[0m`);
  console.log(`  \x1b[2m├─\x1b[0m Docs:     \x1b[36mhttp://localhost:${env.PORT}/api/docs\x1b[0m`);
  console.log(`  \x1b[2m└─\x1b[0m Socket:   \x1b[36mhttp://localhost:${env.PORT}/scale\x1b[0m \x1b[2m(WebSocket)\x1b[0m`);
  console.log("");
}

export function printRoutes() {}

export function printScaleStatus(connected: boolean, error?: string) {
  if (connected) {
    log.ok(`Balanza conectada en ${env.SCALE_PORT}`);
  } else {
    log.warn(`Balanza no disponible: ${error || "desconectada"}`);
    log.info("Se reconectará automáticamente cuando esté disponible");
  }
}

export function printDbStatus(connected: boolean, elapsed: number) {
  if (connected) {
    log.ok(`Base de datos conectada (${elapsed}ms)`);
  } else {
    log.error("No se pudo conectar a la base de datos");
  }
}

export function printShutdown() {
  console.log("");
  log.info("Apagando servidor...");
}
