#!/usr/bin/env npx tsx
/**
 * CLI de diagnóstico para la balanza FAMEAT
 *
 * Uso:
 *   npx tsx src/cli/scale-cli.ts                       → Menú interactivo
 *   npx tsx src/cli/scale-cli.ts ports                  → Listar puertos COM
 *   npx tsx src/cli/scale-cli.ts test [COM3]            → Test de conexión rápido
 *   npx tsx src/cli/scale-cli.ts monitor [COM3]         → Monitor peso en tiempo real
 *   npx tsx src/cli/scale-cli.ts monitor-pro [COM3]     → Monitor con procesador (tare, unidad, filtro)
 *   npx tsx src/cli/scale-cli.ts raw [COM3]             → Ver datos crudos del puerto
 *   npx tsx src/cli/scale-cli.ts tare [COM3]            → Tarar (capturar peso actual como cero)
 *   npx tsx src/cli/scale-cli.ts unit [kg|lb|g]         → Cambiar unidad de visualización
 *   npx tsx src/cli/scale-cli.ts config                 → Ver configuración actual
 *   npx tsx src/cli/scale-cli.ts help                   → Ayuda completa
 */

import { SerialPort } from "serialport";
import { ReadlineParser } from "@serialport/parser-readline";
import { parseScaleData } from "../scale/scaleParser";
import { ScaleProcessor, WeightUnit } from "../scale/scaleProcessor";
import * as readline from "readline";

const DEFAULT_PORT = process.env.SCALE_PORT || "COM3";
const DEFAULT_BAUD = parseInt(process.env.SCALE_BAUD_RATE || "9600");

// Colores para terminal
const c = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
};

function log(msg: string) { console.log(msg); }
function info(msg: string) { console.log(`${c.cyan}[INFO]${c.reset} ${msg}`); }
function ok(msg: string) { console.log(`${c.green}[OK]${c.reset} ${msg}`); }
function err(msg: string) { console.log(`${c.red}[ERROR]${c.reset} ${msg}`); }
function warn(msg: string) { console.log(`${c.yellow}[WARN]${c.reset} ${msg}`); }

function openPort(portPath: string, baudRate: number): Promise<{ port: SerialPort; parser: ReadlineParser }> {
  return new Promise((resolve, reject) => {
    const port = new SerialPort({
      path: portPath,
      baudRate,
      dataBits: 8,
      parity: "none",
      stopBits: 1,
      autoOpen: false,
    });
    const parser = port.pipe(new ReadlineParser({ delimiter: "\r\n" }));

    port.on("error", (e) => reject(e));
    port.open((openErr) => {
      if (openErr) return reject(openErr);
      resolve({ port, parser });
    });
  });
}

// ─── Comandos ───────────────────────────────────────────

async function listPorts() {
  log(`\n${c.bold}═══ Puertos COM Detectados ═══${c.reset}\n`);
  const ports = await SerialPort.list();

  if (ports.length === 0) {
    warn("No se detectaron puertos COM.");
    log("Verifica que la balanza esté conectada por USB.");
    return;
  }

  for (const port of ports) {
    const isCH340 = port.manufacturer?.includes("CH340") ||
                     port.vendorId === "1A86" ||
                     port.pnpId?.includes("CH340");

    log(`  ${c.bold}${port.path}${c.reset}`);
    if (port.manufacturer) log(`    Fabricante:  ${port.manufacturer}`);
    if (port.vendorId) log(`    Vendor ID:   ${port.vendorId}`);
    if (port.productId) log(`    Product ID:  ${port.productId}`);
    if (port.pnpId) log(`    PnP ID:      ${c.dim}${port.pnpId}${c.reset}`);
    if (isCH340) log(`    ${c.green}>>> Probable balanza CH340 <<<${c.reset}`);
    log("");
  }

  log(`Total: ${ports.length} puerto(s)`);
}

async function testConnection(portPath: string = DEFAULT_PORT, baudRate: number = DEFAULT_BAUD) {
  log(`\n${c.bold}═══ Test de Conexión ═══${c.reset}\n`);
  info(`Puerto: ${portPath}, Baud: ${baudRate}, 8N1`);

  return new Promise<void>((resolve) => {
    const port = new SerialPort({
      path: portPath, baudRate, dataBits: 8, parity: "none", stopBits: 1, autoOpen: false,
    });

    const timeout = setTimeout(() => {
      warn("Timeout: No se recibieron datos en 5 segundos.");
      log("La balanza podría estar apagada o el puerto/baud rate es incorrecto.");
      port.close();
      resolve();
    }, 5000);

    port.on("error", (e) => { err(`Error de puerto: ${e.message}`); clearTimeout(timeout); resolve(); });

    port.open((openErr) => {
      if (openErr) {
        err(`No se puede abrir ${portPath}: ${openErr.message}`);
        if (openErr.message.includes("Access denied")) log("El puerto podría estar siendo usado por otro programa.");
        clearTimeout(timeout); resolve(); return;
      }

      ok(`Puerto ${portPath} abierto correctamente`);
      info("Esperando datos de la balanza (5s)...\n");

      const parser = port.pipe(new ReadlineParser({ delimiter: "\r\n" }));
      let received = false;

      parser.on("data", (line: string) => {
        if (!received) {
          received = true;
          clearTimeout(timeout);
          ok("Datos recibidos de la balanza!");
          log(`  Raw: "${line}"`);

          const parsed = parseScaleData(line);
          if (parsed) {
            ok("Datos parseados correctamente:");
            log(`  Peso: ${parsed.weight.toFixed(3)} ${parsed.unit}`);
            log(`  Estable: ${parsed.stable ? "Sí" : "No"}`);
          } else {
            warn("No se pudo parsear el formato.");
            log("  Usa el comando 'raw' para ver los datos crudos.");
          }

          port.close();
          resolve();
        }
      });
    });
  });
}

async function monitorWeight(portPath: string = DEFAULT_PORT, baudRate: number = DEFAULT_BAUD, returnToMenu: boolean = false): Promise<void> {
  log(`\n${c.bold}═══ Monitor de Peso (Simple) ═══${c.reset}`);
  log(`Puerto: ${portPath} | Baud: ${baudRate}`);
  log(`${c.dim}${returnToMenu ? "[M] Menú  " : ""}[Q] Salir${c.reset}\n`);

  return new Promise<void>((resolve) => {
    openPort(portPath, baudRate).then(({ port, parser }) => {
      ok("Conectado. Leyendo peso...\n");

      parser.on("data", (line: string) => {
        const parsed = parseScaleData(line);
        if (parsed) {
          const status = parsed.stable ? `${c.green}ESTABLE${c.reset}` : `${c.yellow}INESTABLE${c.reset}`;
          process.stdout.write(`\r  ${c.bold}${parsed.weight.toFixed(3)} ${parsed.unit}${c.reset}  [${status}]    `);
        }
      });

      const cleanup = () => {
        if (process.stdin.isTTY) process.stdin.setRawMode(false);
        process.stdin.removeAllListeners("data");
        port.close();
      };

      if (process.stdin.isTTY) {
        process.stdin.setRawMode(true);
        process.stdin.resume();
        process.stdin.setEncoding("utf8");

        process.stdin.on("data", (key: string) => {
          if (key.toLowerCase() === "m" && returnToMenu) {
            cleanup();
            log("\n");
            resolve();
          } else if (key.toLowerCase() === "q" || key === "\u0003") {
            cleanup();
            log("\n");
            info("Monitor detenido.");
            process.exit(0);
          }
        });
      }

      process.on("SIGINT", () => { cleanup(); log("\n"); info("Monitor detenido."); process.exit(0); });
    }).catch((e: any) => {
      err(`No se puede abrir ${portPath}: ${e.message}`);
      resolve();
    });
  });
}

async function monitorPro(portPath: string = DEFAULT_PORT, baudRate: number = DEFAULT_BAUD, returnToMenu: boolean = false): Promise<void> {
  log(`\n${c.bold}═══ Monitor PRO (con procesador de software) ═══${c.reset}`);
  log(`Puerto: ${portPath} | Baud: ${baudRate}`);
  log(`${c.dim}Controles: [T] Tarar  [C] Quitar tare  [K] kg  [L] lb  [G] g  [I] Cambiar entrada  ${returnToMenu ? "[M] Menú  " : ""}[Q] Salir${c.reset}\n`);

  const processor = new ScaleProcessor();

  return new Promise<void>((resolve) => {
    openPort(portPath, baudRate).then(({ port, parser }) => {
      ok("Conectado.\n");

      const cleanup = () => {
        if (process.stdin.isTTY) process.stdin.setRawMode(false);
        process.stdin.removeAllListeners("data");
        port.close();
      };

      // Habilitar raw mode para capturar teclas
      if (process.stdin.isTTY) {
        process.stdin.setRawMode(true);
        process.stdin.resume();
        process.stdin.setEncoding("utf8");

        process.stdin.on("data", (key: string) => {
          switch (key.toLowerCase()) {
            case "t": {
              const offset = processor.tare();
              process.stdout.write(`\n  ${c.magenta}[TARE] Offset: ${offset.toFixed(3)} kg${c.reset}\n`);
              break;
            }
            case "c":
              processor.clearTare();
              process.stdout.write(`\n  ${c.magenta}[TARE] Removido${c.reset}\n`);
              break;
            case "k":
              processor.setUnit("kg");
              process.stdout.write(`\n  ${c.blue}[UNIDAD] kg${c.reset}\n`);
              break;
            case "l":
              processor.setUnit("lb");
              process.stdout.write(`\n  ${c.blue}[UNIDAD] lb${c.reset}\n`);
              break;
            case "g":
              processor.setUnit("g");
              process.stdout.write(`\n  ${c.blue}[MOSTRAR] g${c.reset}\n`);
              break;
            case "i": {
              const cfg = processor.getConfig();
              const newInput = cfg.inputUnit === "kg" ? "lb" : "kg";
              processor.setInputUnit(newInput);
              process.stdout.write(`\n  ${c.yellow}[ENTRADA] Balanza envía en: ${newInput.toUpperCase()}${c.reset}\n`);
              break;
            }
            case "m":
              if (returnToMenu) {
                cleanup();
                log("\n");
                resolve();
              }
              break;
            case "q":
            case "\u0003": // Ctrl+C
              cleanup();
              log("\n");
              info("Monitor PRO detenido.");
              process.exit(0);
          }
        });
      }

      parser.on("data", (line: string) => {
        const reading = parseScaleData(line);
        if (!reading) return;

        const processed = processor.process(reading);
        if (!processed) return;

        const stableStr = processed.stable
          ? `${c.green}ESTABLE${c.reset}`
          : `${c.yellow}INESTABLE${c.reset}`;

        const tareStr = processed.tareActive
          ? `${c.magenta} TARE:${processed.tareOffset.toFixed(3)}kg${c.reset}`
          : "";

        const unitLabel = processed.unit;
        const weightStr = processed.unit === "g"
          ? processed.weight.toFixed(0)
          : processed.weight.toFixed(3);

        const inputLabel = `${c.dim}in:${processor.getConfig().inputUnit}${c.reset}`;
        process.stdout.write(
          `\r  ${c.bold}${weightStr} ${unitLabel}${c.reset}  [${stableStr}]${tareStr}  ${c.dim}raw:${processed.rawWeight.toFixed(3)}kg${c.reset}  ${inputLabel}    `
        );
      });

      // Fallback si no es TTY
      process.on("SIGINT", () => { cleanup(); log("\n"); info("Monitor PRO detenido."); process.exit(0); });

    }).catch((e: any) => {
      err(`No se puede abrir ${portPath}: ${e.message}`);
      resolve();
    });
  });
}

async function tareCommand(portPath: string = DEFAULT_PORT, baudRate: number = DEFAULT_BAUD) {
  log(`\n${c.bold}═══ Tare (Capturar Cero) ═══${c.reset}\n`);
  info(`Leyendo peso actual para usarlo como tare...`);

  try {
    const { port, parser } = await openPort(portPath, baudRate);
    const readings: number[] = [];

    parser.on("data", (line: string) => {
      const parsed = parseScaleData(line);
      if (parsed) readings.push(parsed.weight);
    });

    // Recoger 10 lecturas (~2s) y promediar
    await new Promise<void>((resolve) => setTimeout(resolve, 2000));

    port.close();

    if (readings.length === 0) {
      err("No se recibieron lecturas.");
      return;
    }

    const avg = readings.reduce((a, b) => a + b, 0) / readings.length;
    log("");
    ok(`Tare calculado: ${avg.toFixed(3)} kg`);
    log(`  Lecturas usadas: ${readings.length}`);
    log(`  Rango: ${Math.min(...readings).toFixed(3)} - ${Math.max(...readings).toFixed(3)} kg`);
    log("");
    info("Este valor se usará como offset en el sistema POS.");
    info("El peso mostrado será: lectura - tare");
    log(`  Ejemplo: si la balanza lee 1.500 kg → mostrará ${(1.5 - avg).toFixed(3)} kg`);
  } catch (e: any) {
    err(e.message);
  }
}

async function unitDemo(
  displayUnit: string = "kg",
  portPath: string = DEFAULT_PORT,
  baudRate: number = DEFAULT_BAUD,
  inputUnit: string = "kg",
  returnToMenu: boolean = false
): Promise<void> {
  const validUnits: WeightUnit[] = ["kg", "lb", "g"];
  if (!validUnits.includes(displayUnit as WeightUnit)) {
    err(`Unidad inválida: "${displayUnit}". Usa: kg, lb, g`);
    return;
  }
  if (!validUnits.includes(inputUnit as WeightUnit)) {
    err(`Unidad de entrada inválida: "${inputUnit}". Usa: kg, lb`);
    return;
  }

  log(`\n${c.bold}═══ Conversión de Unidad ═══${c.reset}`);
  log(`  Balanza envía en: ${c.bold}${inputUnit.toUpperCase()}${c.reset}`);
  log(`  Mostrando en:     ${c.bold}${displayUnit.toUpperCase()}${c.reset}`);
  log(`  ${c.dim}${returnToMenu ? "[M] Menú  " : ""}[Q] Salir${c.reset}\n`);

  // Primero normalizar a kg, luego convertir a displayUnit
  const toKg: Record<string, number> = { kg: 1, lb: 1 / 2.20462, g: 1 / 1000 };
  const fromKg: Record<string, { f: number; d: number }> = {
    kg: { f: 1, d: 3 },
    lb: { f: 2.20462, d: 3 },
    g: { f: 1000, d: 0 },
  };

  const inputFactor = toKg[inputUnit];
  const { f: outputFactor, d } = fromKg[displayUnit];

  return new Promise<void>((resolve) => {
    openPort(portPath, baudRate).then(({ port, parser }) => {
      ok("Conectado.\n");

      const cleanup = () => {
        if (process.stdin.isTTY) process.stdin.setRawMode(false);
        process.stdin.removeAllListeners("data");
        port.close();
      };

      if (process.stdin.isTTY) {
        process.stdin.setRawMode(true);
        process.stdin.resume();
        process.stdin.setEncoding("utf8");

        process.stdin.on("data", (key: string) => {
          if (key.toLowerCase() === "m" && returnToMenu) {
            cleanup();
            log("\n");
            resolve();
          } else if (key.toLowerCase() === "q" || key === "\u0003") {
            cleanup();
            log("\n");
            process.exit(0);
          }
        });
      }

      parser.on("data", (line: string) => {
        const parsed = parseScaleData(line);
        if (parsed) {
          const kg = parsed.weight * inputFactor;
          const converted = kg * outputFactor;
          process.stdout.write(
            `\r  ${c.bold}${converted.toFixed(d)} ${displayUnit}${c.reset}  ${c.dim}(raw: ${parsed.weight.toFixed(3)} ${inputUnit})${c.reset}    `
          );
        }
      });

      process.on("SIGINT", () => { cleanup(); log("\n"); process.exit(0); });
    }).catch((e: any) => {
      err(e.message);
      resolve();
    });
  });
}

async function rawMonitor(portPath: string = DEFAULT_PORT, baudRate: number = DEFAULT_BAUD, returnToMenu: boolean = false): Promise<void> {
  log(`\n${c.bold}═══ Datos Crudos del Puerto Serial ═══${c.reset}`);
  log(`Puerto: ${portPath} | Baud: ${baudRate}`);
  log(`${c.dim}${returnToMenu ? "[M] Menú  " : ""}[Q] Salir${c.reset}\n`);

  return new Promise<void>((resolve) => {
    openPort(portPath, baudRate).then(({ port, parser }) => {
      ok("Conectado. Mostrando datos crudos...\n");
      let lineNum = 0;

      const cleanup = () => {
        if (process.stdin.isTTY) process.stdin.setRawMode(false);
        process.stdin.removeAllListeners("data");
        port.close();
      };

      if (process.stdin.isTTY) {
        process.stdin.setRawMode(true);
        process.stdin.resume();
        process.stdin.setEncoding("utf8");

        process.stdin.on("data", (key: string) => {
          if (key.toLowerCase() === "m" && returnToMenu) {
            cleanup();
            log(`\n`);
            info(`Total líneas: ${lineNum}`);
            resolve();
          } else if (key.toLowerCase() === "q" || key === "\u0003") {
            cleanup();
            log(`\n`);
            info(`Total líneas: ${lineNum}`);
            process.exit(0);
          }
        });
      }

      parser.on("data", (line: string) => {
        lineNum++;
        const hex = Buffer.from(line).toString("hex").match(/.{1,2}/g)?.join(" ") || "";
        log(`${c.dim}${String(lineNum).padStart(4)}${c.reset} | ${c.cyan}${line}${c.reset}`);
        log(`     | HEX: ${c.dim}${hex}${c.reset}`);

        const parsed = parseScaleData(line);
        if (parsed) {
          log(`     | ${c.green}→ ${parsed.weight.toFixed(3)} ${parsed.unit} (${parsed.stable ? "estable" : "inestable"})${c.reset}`);
        } else {
          log(`     | ${c.yellow}→ formato no reconocido${c.reset}`);
        }
      });

      process.on("SIGINT", () => { cleanup(); log("\n"); info(`Total líneas: ${lineNum}`); process.exit(0); });
    }).catch((e: any) => {
      err(e.message);
      resolve();
    });
  });
}

async function showConfig() {
  log(`\n${c.bold}═══ Configuración ═══${c.reset}\n`);

  log(`${c.bold}  Conexión Serial${c.reset}`);
  log(`    Puerto:      ${DEFAULT_PORT}`);
  log(`    Baud Rate:   ${DEFAULT_BAUD}`);
  log(`    Data Bits:   8`);
  log(`    Paridad:     Ninguna`);
  log(`    Stop Bits:   1`);
  log("");

  log(`${c.bold}  Procesador de Software (valores default)${c.reset}`);
  log(`    Entrada balanza:     kg — cambiar si presionas kg/lb en la balanza`);
  log(`    Unidad mostrar:      kg`);
  log(`    Peso mínimo:         0.002 kg (2g) — filtro de ruido`);
  log(`    Lecturas estables:   3 — lecturas iguales para "estable"`);
  log(`    Tolerancia estable:  0.002 kg (2g) — margen de variación`);
  log(`    Promedio muestras:   3 — suavizado de lecturas`);
  log("");

  log(`${c.bold}  Unidades disponibles${c.reset}`);
  log(`    kg  → kilogramos (factor: 1)`);
  log(`    lb  → libras (factor: 2.20462)`);
  log(`    g   → gramos (factor: 1000)`);
  log("");

  log(`${c.dim}Variables de entorno:${c.reset}`);
  log(`  SCALE_PORT=COM3       Puerto serial`);
  log(`  SCALE_BAUD_RATE=9600  Velocidad`);
}

function printMenu() {
  log(`\n${c.bold}${c.red}═════════════════════════════════════════${c.reset}`);
  log(`${c.bold}   FAMEAT - CLI Balanza / Diagnóstico${c.reset}`);
  log(`${c.bold}${c.red}═════════════════════════════════════════${c.reset}\n`);

  log(`  ${c.bold}Diagnóstico${c.reset}`);
  log("  1) Listar puertos COM");
  log("  2) Test de conexión rápido");
  log("  3) Monitor de peso simple");
  log("  4) Ver datos crudos (debug)");
  log("");
  log(`  ${c.bold}Procesamiento${c.reset}`);
  log("  5) Monitor PRO (tare, unidad, filtro interactivo)");
  log("  6) Tare (capturar cero)");
  log("");
  log(`  ${c.bold}Otros${c.reset}`);
  log("  7) Ver configuración");
  log("  0) Salir");
  log("");
}

async function interactiveMenu() {
  while (true) {
    printMenu();

    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const ask = (q: string): Promise<string> => new Promise((resolve) => rl.question(q, resolve));

    const choice = await ask(`  ${c.cyan}Seleccione una opción:${c.reset} `);
    rl.close();

    switch (choice.trim()) {
      case "1": await listPorts(); break;
      case "2": await testConnection(); break;
      case "3": await monitorWeight(DEFAULT_PORT, DEFAULT_BAUD, true); break;
      case "4": await rawMonitor(DEFAULT_PORT, DEFAULT_BAUD, true); break;
      case "5": await monitorPro(DEFAULT_PORT, DEFAULT_BAUD, true); break;
      case "6": await tareCommand(); break;
      case "7": await showConfig(); break;
      case "0":
        log(`\n  ${c.dim}Adiós!${c.reset}\n`);
        process.exit(0);
      default:
        err("Opción no válida");
    }
  }
}

// ─── Main ───────────────────────────────────────────────

async function main() {
  const [,, command, arg1, arg2] = process.argv;

  switch (command) {
    case "ports":
      await listPorts();
      break;
    case "test":
      await testConnection(arg1 || DEFAULT_PORT, arg2 ? parseInt(arg2) : DEFAULT_BAUD);
      break;
    case "monitor":
      await monitorWeight(arg1 || DEFAULT_PORT, arg2 ? parseInt(arg2) : DEFAULT_BAUD);
      break;
    case "monitor-pro":
      await monitorPro(arg1 || DEFAULT_PORT, arg2 ? parseInt(arg2) : DEFAULT_BAUD);
      break;
    case "raw":
      await rawMonitor(arg1 || DEFAULT_PORT, arg2 ? parseInt(arg2) : DEFAULT_BAUD);
      break;
    case "tare":
      await tareCommand(arg1 || DEFAULT_PORT, arg2 ? parseInt(arg2) : DEFAULT_BAUD);
      break;
    case "unit":
      await unitDemo(arg1 || "kg", DEFAULT_PORT, DEFAULT_BAUD, "kg");
      break;
    case "unit-from-lb":
      await unitDemo(arg1 || "kg", DEFAULT_PORT, DEFAULT_BAUD, "lb");
      break;
    case "config":
      await showConfig();
      break;
    case "help":
    case "--help":
    case "-h":
      log(`
${c.bold}FAMEAT CLI - Herramientas de Balanza${c.reset}

Uso:
  npx tsx src/cli/scale-cli.ts [comando] [opciones]

${c.bold}Diagnóstico:${c.reset}
  ports                  Listar todos los puertos COM detectados
  test [COM] [baud]      Test rápido de conexión (5s)
  monitor [COM] [baud]   Monitorear peso en tiempo real (simple)
  raw [COM] [baud]       Ver datos crudos + HEX (debug)

${c.bold}Procesamiento:${c.reset}
  monitor-pro [COM]      Monitor interactivo con controles:
                         [T] Tarar  [C] Quitar tare  [I] Cambiar entrada kg/lb
                         [K] kg  [L] lb  [G] g  [Q] Salir
  tare [COM]             Capturar peso actual como tare
  unit [kg|lb|g]         Mostrar peso (asume balanza en kg)
  unit-from-lb [kg|lb|g] Mostrar peso (asume balanza en lb)

${c.bold}Configuración:${c.reset}
  config                 Mostrar configuración actual
  help                   Mostrar esta ayuda

${c.bold}Ejemplos:${c.reset}
  npx tsx src/cli/scale-cli.ts ports
  npx tsx src/cli/scale-cli.ts monitor-pro COM3
  npx tsx src/cli/scale-cli.ts unit lb COM3
  npx tsx src/cli/scale-cli.ts tare COM3
`);
      break;
    default:
      await interactiveMenu();
  }
}

main().catch((e) => {
  err(e.message);
  process.exit(1);
});
