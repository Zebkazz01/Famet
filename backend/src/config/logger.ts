import os from "os";
import { env } from "./env";

const c = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
};

function timestamp(): string {
  return new Date().toLocaleTimeString("es-MX", { hour12: false });
}

export const log = {
  info: (msg: string) => console.log(`${c.dim}${timestamp()}${c.reset} ${c.cyan}INFO${c.reset}  ${msg}`),
  ok: (msg: string) => console.log(`${c.dim}${timestamp()}${c.reset} ${c.green}OK${c.reset}    ${msg}`),
  warn: (msg: string) => console.log(`${c.dim}${timestamp()}${c.reset} ${c.yellow}WARN${c.reset}  ${msg}`),
  error: (msg: string) => console.log(`${c.dim}${timestamp()}${c.reset} ${c.red}ERROR${c.reset} ${msg}`),
  route: (method: string, path: string) => console.log(`${c.dim}${timestamp()}${c.reset} ${c.dim}ROUTE${c.reset} ${c.blue}${method.padEnd(6)}${c.reset} ${path}`),
};

export function printBanner(startTime: number) {
  const elapsed = Date.now() - startTime;

  console.log("");
  console.log(`${c.red}${c.bold}  ███████╗ █████╗ ███╗   ███╗███████╗ █████╗ ████████╗${c.reset}`);
  console.log(`${c.red}${c.bold}  ██╔════╝██╔══██╗████╗ ████║██╔════╝██╔══██╗╚══██╔══╝${c.reset}`);
  console.log(`${c.red}${c.bold}  █████╗  ███████║██╔████╔██║█████╗  ███████║   ██║   ${c.reset}`);
  console.log(`${c.red}${c.bold}  ██╔══╝  ██╔══██║██║╚██╔╝██║██╔══╝  ██╔══██║   ██║   ${c.reset}`);
  console.log(`${c.red}${c.bold}  ██║     ██║  ██║██║ ╚═╝ ██║███████╗██║  ██║   ██║   ${c.reset}`);
  console.log(`${c.red}${c.bold}  ╚═╝     ╚═╝  ╚═╝╚═╝     ╚═╝╚══════╝╚═╝  ╚═╝   ╚═╝   ${c.reset}`);
  console.log(`${c.dim}  Punto de Venta v1.0.0${c.reset}`);
  console.log("");
  console.log(`${c.bold}  Servidor listo en ${c.green}${elapsed}ms${c.reset}`);
  console.log("");
  console.log(`  ${c.bold}Endpoints${c.reset}`);
  console.log(`  ${c.dim}├─${c.reset} Local:    ${c.cyan}${c.bold}http://localhost:${env.PORT}${c.reset}`);
  console.log(`  ${c.dim}├─${c.reset} API:      ${c.cyan}http://localhost:${env.PORT}/api${c.reset}`);
  console.log(`  ${c.dim}└─${c.reset} Socket:   ${c.cyan}http://localhost:${env.PORT}/scale${c.reset} ${c.dim}(WebSocket)${c.reset}`);
  console.log("");
  console.log(`  ${c.bold}Configuración${c.reset}`);
  console.log(`  ${c.dim}├─${c.reset} Node:     ${c.white}${process.version}${c.reset}`);
  console.log(`  ${c.dim}├─${c.reset} Sistema:  ${c.white}${os.type()} ${os.release()} (${os.arch()})${c.reset}`);
  console.log(`  ${c.dim}├─${c.reset} Memoria:  ${c.white}${Math.round(os.freemem() / 1024 / 1024)} MB libre / ${Math.round(os.totalmem() / 1024 / 1024)} MB total${c.reset}`);
  console.log(`  ${c.dim}├─${c.reset} PID:      ${c.white}${process.pid}${c.reset}`);
  console.log(`  ${c.dim}└─${c.reset} Entorno:  ${c.white}${process.env.NODE_ENV || "development"}${c.reset}`);
  console.log("");
  console.log(`  ${c.bold}Base de Datos${c.reset}`);
  const dbUrl = env.DATABASE_URL;
  const dbHost = dbUrl.match(/@([^:\/]+)/)?.[1] || "localhost";
  const dbPort = dbUrl.match(/@[^:]+:(\d+)/)?.[1] || "5432";
  const dbName = dbUrl.match(/\/(\w+)(\?|$)/)?.[1] || "fameat_pos";
  console.log(`  ${c.dim}├─${c.reset} Host:     ${c.white}${dbHost}:${dbPort}${c.reset}`);
  console.log(`  ${c.dim}└─${c.reset} Database: ${c.white}${dbName}${c.reset}`);
  console.log("");
  console.log(`  ${c.bold}Balanza${c.reset}`);
  console.log(`  ${c.dim}├─${c.reset} Puerto:   ${c.white}${env.SCALE_PORT}${c.reset}`);
  console.log(`  ${c.dim}└─${c.reset} Baud:     ${c.white}${env.SCALE_BAUD_RATE}${c.reset} ${c.dim}(8N1)${c.reset}`);
  console.log("");
}

export function printRoutes() {
  // Rutas se omiten del banner para mantenerlo limpio
}

export function printScaleStatus(connected: boolean, error?: string) {
  if (connected) {
    log.ok(`Balanza conectada en ${c.bold}${env.SCALE_PORT}${c.reset}`);
  } else {
    log.warn(`Balanza no disponible: ${c.dim}${error || "desconectada"}${c.reset}`);
    log.info(`Se reconectará automáticamente cuando esté disponible`);
  }
}

export function printDbStatus(connected: boolean, elapsed: number) {
  if (connected) {
    log.ok(`Base de datos conectada ${c.dim}(${elapsed}ms)${c.reset}`);
  } else {
    log.error(`No se pudo conectar a la base de datos`);
  }
}

export function printShutdown() {
  console.log("");
  log.info("Apagando servidor...");
}
