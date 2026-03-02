import type { Plugin } from "vite";
import os from "os";

const c = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
};

export function fameatBanner(): Plugin {
  let startTime: number;

  return {
    name: "fameat-banner",
    configResolved() {
      startTime = Date.now();
    },
    configureServer(server) {
      server.httpServer?.once("listening", () => {
        const elapsed = Date.now() - startTime;
        const address = server.httpServer?.address();
        const port = typeof address === "object" && address ? address.port : 5173;

        // Limpiar el banner default de Vite esperando un tick
        setTimeout(() => {
          console.log("");
          console.log(`${c.red}${c.bold}  ███████╗ █████╗ ███╗   ███╗███████╗ █████╗ ████████╗${c.reset}`);
          console.log(`${c.red}${c.bold}  ██╔════╝██╔══██╗████╗ ████║██╔════╝██╔══██╗╚══██╔══╝${c.reset}`);
          console.log(`${c.red}${c.bold}  █████╗  ███████║██╔████╔██║█████╗  ███████║   ██║   ${c.reset}`);
          console.log(`${c.red}${c.bold}  ██╔══╝  ██╔══██║██║╚██╔╝██║██╔══╝  ██╔══██║   ██║   ${c.reset}`);
          console.log(`${c.red}${c.bold}  ██║     ██║  ██║██║ ╚═╝ ██║███████╗██║  ██║   ██║   ${c.reset}`);
          console.log(`${c.red}${c.bold}  ╚═╝     ╚═╝  ╚═╝╚═╝     ╚═╝╚══════╝╚═╝  ╚═╝   ╚═╝   ${c.reset}`);
          console.log(`${c.dim}  Frontend v1.0.0${c.reset}`);
          console.log("");
          console.log(`  ${c.bold}Dev server listo en ${c.green}${elapsed}ms${c.reset}`);
          console.log("");
          console.log(`  ${c.bold}Acceso${c.reset}`);
          console.log(`  ${c.dim}├─${c.reset} Local:    ${c.cyan}${c.bold}http://localhost:${port}${c.reset}`);
          console.log(`  ${c.dim}└─${c.reset} Network:  ${c.cyan}http://${getLocalIP()}:${port}${c.reset}`);
          console.log("");
          console.log(`  ${c.bold}Proxy${c.reset} ${c.dim}(Backend API)${c.reset}`);
          console.log(`  ${c.dim}├─${c.reset} /api/*       ${c.dim}→${c.reset} http://localhost:3001`);
          console.log(`  ${c.dim}└─${c.reset} /socket.io/* ${c.dim}→${c.reset} http://localhost:3001 ${c.dim}(WebSocket)${c.reset}`);
          console.log("");
          console.log(`  ${c.bold}Entorno${c.reset}`);
          console.log(`  ${c.dim}├─${c.reset} Node:     ${c.white}${process.version}${c.reset}`);
          console.log(`  ${c.dim}├─${c.reset} Sistema:  ${c.white}${os.type()} ${os.release()} (${os.arch()})${c.reset}`);
          console.log(`  ${c.dim}├─${c.reset} Memoria:  ${c.white}${Math.round(os.freemem() / 1024 / 1024)} MB libre / ${Math.round(os.totalmem() / 1024 / 1024)} MB total${c.reset}`);
          console.log(`  ${c.dim}└─${c.reset} PID:      ${c.white}${process.pid}${c.reset}`);
          console.log("");
          console.log(`  ${c.dim}Presiona ${c.bold}h + enter${c.dim} para ver atajos de Vite${c.reset}`);
          console.log("");
        }, 100);
      });
    },
  };
}

function getLocalIP(): string {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      if (iface.family === "IPv4" && !iface.internal) {
        return iface.address;
      }
    }
  }
  return "localhost";
}
