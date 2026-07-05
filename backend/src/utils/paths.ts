import path from "path";
import fs from "fs";

/**
 * Raíz del directorio backend (sea ejecutándose desde src/ con tsx o desde dist/ con node).
 * __dirname en dev: backend/src/utils → resolvemos a backend/
 * __dirname en prod: backend/dist/utils → resolvemos a backend/
 */
export const BACKEND_ROOT = path.resolve(__dirname, "..", "..");

/**
 * Ruta absoluta a backend/uploads/<sub>. Crea el directorio si no existe.
 * Funciona independiente del cwd desde el cual se lance Node.
 * Override con env UPLOADS_DIR si se desea.
 */
export function uploadsDir(sub?: string): string {
  const base = process.env.UPLOADS_DIR
    ? path.resolve(process.env.UPLOADS_DIR)
    : path.join(BACKEND_ROOT, "uploads");
  const full = sub ? path.join(base, sub) : base;
  if (!fs.existsSync(full)) fs.mkdirSync(full, { recursive: true });
  return full;
}

/** Ruta absoluta del directorio de backups (override con BACKUP_DIR). */
export function backupsDir(): string {
  const base = process.env.BACKUP_DIR
    ? path.resolve(process.env.BACKUP_DIR)
    : path.join(BACKEND_ROOT, "backups");
  if (!fs.existsSync(base)) fs.mkdirSync(base, { recursive: true });
  return base;
}
