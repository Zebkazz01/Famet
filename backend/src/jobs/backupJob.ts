/**
 * Backup automático de PostgreSQL.
 * - Dump diario con pg_dump → backups/YYYY-MM-DD_HHmmss.dump
 * - Retiene últimos N días (default 14)
 * - Programable vía cron (default: 02:00 todos los días)
 *
 * Busca pg_dump en PATH o en rutas comunes de instalación de PostgreSQL.
 *
 * Variables de entorno:
 *   BACKUP_DIR          — directorio destino (default: backend/backups)
 *   BACKUP_RETENTION    — días de retención (default: 14)
 *   BACKUP_CRON         — cron expression (default: "0 2 * * *")
 *   BACKUP_ENABLED      — "false" para deshabilitar (default: true)
 *   PG_DUMP_PATH        — ruta explícita a pg_dump (opcional)
 */
import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import * as cronManager from "./cronManager";
import { log } from "../config/logger";
import { env } from "../config/env";
import { backupsDir } from "../utils/paths";

function parseDbUrl(url: string) {
  // postgresql://user:pass@host:port/dbname
  const m = url.match(/^postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+?)(?:\?.*)?$/);
  if (!m) throw new Error("DATABASE_URL inválida para backup");
  return { user: m[1], pass: m[2], host: m[3], port: m[4], db: m[5] };
}

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function timestamp(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

function findPgDump(): string {
  if (process.env.PG_DUMP_PATH) return process.env.PG_DUMP_PATH;
  // En Windows, buscar en rutas comunes de instalación
  const commonPaths = [
    "C:\\Program Files\\PostgreSQL\\17\\bin\\pg_dump.exe",
    "C:\\Program Files\\PostgreSQL\\16\\bin\\pg_dump.exe",
    "C:\\Program Files\\PostgreSQL\\15\\bin\\pg_dump.exe",
    "C:\\Program Files\\PostgreSQL\\14\\bin\\pg_dump.exe",
    "C:\\Program Files\\PostgreSQL\\13\\bin\\pg_dump.exe",
    "/usr/bin/pg_dump",
    "/usr/lib/postgresql/*/bin/pg_dump",
  ];
  for (const p of commonPaths) {
    if (fs.existsSync(p)) return p;
  }
  return "pg_dump"; // fallback: confiar en PATH
}

function findPgRestore(): string {
  if (process.env.PG_RESTORE_PATH) return process.env.PG_RESTORE_PATH;
  const commonPaths = [
    "C:\\Program Files\\PostgreSQL\\17\\bin\\pg_restore.exe",
    "C:\\Program Files\\PostgreSQL\\16\\bin\\pg_restore.exe",
    "C:\\Program Files\\PostgreSQL\\15\\bin\\pg_restore.exe",
    "C:\\Program Files\\PostgreSQL\\14\\bin\\pg_restore.exe",
    "C:\\Program Files\\PostgreSQL\\13\\bin\\pg_restore.exe",
    "/usr/bin/pg_restore",
  ];
  for (const p of commonPaths) {
    if (fs.existsSync(p)) return p;
  }
  return "pg_restore";
}

export async function runBackup(): Promise<{ file: string; size: number }> {
  const { user, pass, host, port, db } = parseDbUrl(env.DATABASE_URL);
  const backupDir = backupsDir();
  ensureDir(backupDir);

  const file = path.join(backupDir, `${db}_${timestamp()}.dump`);
  log.info(`[backup] iniciando → ${file}`);

  return new Promise((resolve, reject) => {
    const pgDumpBin = findPgDump();
    log.info(`[backup] usando pg_dump: ${pgDumpBin}`);
    const ps = spawn(
      pgDumpBin,
      ["-U", user, "-h", host, "-p", port, "-d", db, "-F", "c", "-f", file],
      { env: { ...process.env, PGPASSWORD: pass } },
    );

    let stderr = "";
    ps.stderr.on("data", (d) => { stderr += d.toString(); });
    ps.on("error", (err) => {
      log.error(`[backup] error spawn pg_dump: ${err.message}`);
      reject(err);
    });
    ps.on("close", (code) => {
      if (code !== 0) {
        log.error(`[backup] pg_dump exit ${code}: ${stderr}`);
        return reject(new Error(`pg_dump exit ${code}: ${stderr}`));
      }
      try {
        const size = fs.statSync(file).size;
        log.info(`[backup] OK ${file} (${(size / 1024).toFixed(1)} KB)`);
        cleanupOld(backupDir);
        resolve({ file, size });
      } catch (e: any) {
        reject(e);
      }
    });
  });
}

function cleanupOld(dir: string) {
  const retention = Number(process.env.BACKUP_RETENTION || 14);
  const cutoff = Date.now() - retention * 24 * 60 * 60 * 1000;
  try {
    const files = fs.readdirSync(dir).filter((f) => f.endsWith(".dump"));
    for (const f of files) {
      const full = path.join(dir, f);
      const stat = fs.statSync(full);
      if (stat.mtimeMs < cutoff) {
        fs.unlinkSync(full);
        log.info(`[backup] eliminado antiguo ${f}`);
      }
    }
  } catch (e: any) {
    log.warn(`[backup] cleanup error: ${e.message}`);
  }
}

/**
 * Lista los backups disponibles en BACKUP_DIR ordenados por fecha desc.
 */
export function listBackups(): Array<{ name: string; size: number; modifiedAt: Date }> {
  const dir = backupsDir();
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter((f) => f.endsWith(".dump"))
    .map((f) => {
      const stat = fs.statSync(path.join(dir, f));
      return { name: f, size: stat.size, modifiedAt: stat.mtime };
    })
    .sort((a, b) => b.modifiedAt.getTime() - a.modifiedAt.getTime());
}

/**
 * Restaura un backup. PELIGROSO: sobrescribe la BD actual.
 * Antes de restaurar genera un backup de seguridad de la BD actual.
 * @param fileName Nombre del .dump dentro de BACKUP_DIR
 * @param opts.dropFirst Si true, hace pg_restore --clean (limpia objetos antes de restaurar)
 */
export async function restoreBackup(
  fileName: string,
  opts: { dropFirst?: boolean } = {},
): Promise<{ restored: string; safetyBackup: string }> {
  const { user, pass, host, port, db } = parseDbUrl(env.DATABASE_URL);
  const dir = backupsDir();
  const file = path.join(dir, fileName);
  if (!fs.existsSync(file)) throw new Error(`Backup no encontrado: ${fileName}`);

  // Safety backup primero
  log.warn(`[restore] Generando backup de seguridad antes de restaurar...`);
  const safety = await runBackup();

  log.warn(`[restore] Restaurando desde ${fileName}...`);

  return new Promise((resolve, reject) => {
    const args = [
      "-U", user, "-h", host, "-p", port,
      "-d", db,
      "--no-owner", "--no-privileges",
    ];
    if (opts.dropFirst) args.push("--clean", "--if-exists");
    args.push(file);

    const pgRestoreBin = findPgRestore();
    log.info(`[restore] usando pg_restore: ${pgRestoreBin}`);
    const ps = spawn(pgRestoreBin, args, {
      env: { ...process.env, PGPASSWORD: pass },
    });
    let stderr = "";
    ps.stderr.on("data", (d) => { stderr += d.toString(); });
    ps.on("error", (err) => {
      log.error(`[restore] error spawn pg_restore: ${err.message}`);
      reject(err);
    });
    ps.on("close", (code) => {
      // pg_restore puede retornar code != 0 por warnings; revisamos stderr para errores reales
      const hasErrors = /\bERROR:/.test(stderr) && !opts.dropFirst;
      if (code !== 0 && hasErrors) {
        log.error(`[restore] pg_restore exit ${code}: ${stderr}`);
        return reject(new Error(`pg_restore exit ${code}: ${stderr.slice(0, 500)}`));
      }
      log.ok(`[restore] OK desde ${fileName}`);
      resolve({ restored: fileName, safetyBackup: path.basename(safety.file) });
    });
  });
}

export function registerBackupJob() {
  if (process.env.BACKUP_ENABLED === "false") {
    log.info("[backup] deshabilitado por BACKUP_ENABLED=false");
    return;
  }
  const cronExpr = process.env.BACKUP_CRON || "0 2 * * *"; // 02:00 diario
  cronManager.register("backup", cronExpr, async () => {
    try {
      await runBackup();
    } catch (e: any) {
      log.error(`[backup] fallo: ${e.message}`);
    }
  });
  log.info(`[backup] programado (${cronExpr})`);

  // Backup inicial al arrancar el servidor (si el ultimo es viejo o no hay)
  if (process.env.BACKUP_ON_START !== "false") {
    setTimeout(async () => {
      try {
        const items = (await import("./backupJob").then(m => m.listBackups()));
        const last = items[0];
        const hoursAgo = last ? (Date.now() - new Date(last.modifiedAt).getTime()) / 36e5 : Infinity;
        const minHours = Number(process.env.BACKUP_ON_START_MIN_HOURS || 6);
        if (hoursAgo >= minHours) {
          log.info(`[backup] inicial al arrancar (ultimo fue hace ${isFinite(hoursAgo) ? hoursAgo.toFixed(1) + 'h' : 'nunca'})`);
          await runBackup();
        } else {
          log.info(`[backup] ultimo backup hace ${hoursAgo.toFixed(1)}h, omito inicial`);
        }
      } catch (e: any) {
        log.warn(`[backup] inicial fallo: ${e.message}`);
      }
    }, 5000); // 5s despues del start para no bloquear arranque
  }
}
