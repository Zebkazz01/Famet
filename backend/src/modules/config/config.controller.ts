import { Request, Response } from "express";
import path from "path";
import fs from "fs";
import sharp from "sharp";
import { prisma } from "../../config/database";
import * as configCache from "../../utils/configCache";
import { emitBroadcast } from "../../realtime/socketRegistry";
import { PUBLIC_CONFIG_KEYS } from "./config.schema";

const LOGO_KEY = "business_logo";
const LOGO_VERSION_KEY = "logo_version";
const CONFIG_VERSION_KEY = "config_version";

async function bumpConfigVersion(): Promise<number> {
  return await configCache.bumpVersion(CONFIG_VERSION_KEY);
}

export async function getPublicConfig(_req: Request, res: Response) {
  try {
    await configCache.ensureLoaded();
    const all = configCache.getAll();
    const out: Record<string, string> = {};
    for (const key of PUBLIC_CONFIG_KEYS) {
      if (all[key] !== undefined) out[key] = all[key];
    }
    return res.json(out);
  } catch {
    return res.json({});
  }
}

export async function getConfig(_req: Request, res: Response) {
  await configCache.ensureLoaded();
  return res.json(configCache.getAll());
}

export async function updateConfig(req: Request, res: Response) {
  const body = req.body as Record<string, unknown>;
  const entries: Record<string, string> = {};
  let logoChanged = false;
  let nameChanged = false;
  for (const [key, value] of Object.entries(body)) {
    const str = value === null || value === undefined ? "" : String(value);
    entries[key] = str;
    if (key === LOGO_KEY) logoChanged = true;
    if (key === "business_name") nameChanged = true;
  }
  await configCache.setMany(entries);
  const configVersion = await bumpConfigVersion();
  let logoVersion: number | undefined;
  if (logoChanged) {
    logoVersion = await configCache.bumpVersion(LOGO_VERSION_KEY);
  }
  emitBroadcast("config:updated", {
    keys: Object.keys(entries),
    configVersion,
    logoVersion,
  });

  // Auto-regenerar shortcut Windows si cambió logo o nombre (no bloquea respuesta)
  if ((nameChanged || logoChanged) && process.platform === "win32" && process.env.AUTO_SHORTCUT !== "false") {
    try {
      const { spawn } = require("child_process");
      const path = require("path");
      const repoRoot = path.join(__dirname, "..", "..", "..", "..");
      const child = spawn(
        process.platform === "win32" ? "npm.cmd" : "npm",
        ["run", "shortcut"],
        { cwd: repoRoot, detached: true, stdio: "ignore", shell: true },
      );
      child.unref();
    } catch (e: any) {
      console.warn(`[config] auto-shortcut falló: ${e.message}`);
    }
  }

  return res.json({
    message: "Configuración actualizada",
    configVersion,
    logoVersion,
  });
}

export async function getConfigVersion(_req: Request, res: Response) {
  await configCache.ensureLoaded();
  return res.json({
    logoVersion: configCache.getNumber(LOGO_VERSION_KEY, 0),
    configVersion: configCache.getNumber(CONFIG_VERSION_KEY, 0),
  });
}

export async function uploadLogo(req: Request, res: Response) {
  if (!req.file) return res.status(400).json({ error: "No se envió imagen" });

  const srcFile = req.file.path;
  const logoDir = path.dirname(srcFile);

  // Normalizar: convertir el archivo subido a logo.png 512x512 (cualquier formato origen)
  const masterPath = path.join(logoDir, "logo.png");
  try {
    await sharp(srcFile)
      .resize(512, 512, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toFile(masterPath + ".tmp");
    fs.renameSync(masterPath + ".tmp", masterPath);
    // Si el original no era .png, borrarlo para no dejar huérfanos
    if (path.extname(srcFile).toLowerCase() !== ".png") {
      try { fs.unlinkSync(srcFile); } catch {}
    }
  } catch (e: any) {
    return res.status(400).json({ error: `Imagen inválida: ${e.message}` });
  }

  const logoUrl = `/uploads/logo/logo.png`;
  await configCache.set(LOGO_KEY, logoUrl);
  const logoVersion = await configCache.bumpVersion(LOGO_VERSION_KEY);
  const configVersion = await bumpConfigVersion();

  // Generar iconos PWA en tamaños reales con sharp (PNG legítimos)
  const pwaIconsDir = path.join(process.cwd(), "..", "frontend", "public", "pwa", "icons");
  try {
    if (fs.existsSync(pwaIconsDir)) {
      const targets: Array<{ name: string; size: number; padding?: boolean }> = [
        { name: "icon-any-512.png", size: 512 },
        { name: "icon-any-384.png", size: 384 },
        { name: "icon-any-192.png", size: 192 },
        { name: "icon-any-128.png", size: 128 },
        { name: "icon-any-96.png", size: 96 },
        { name: "icon-maskable-512.png", size: 512, padding: true },
        { name: "icon-maskable-192.png", size: 192, padding: true },
        { name: "apple-touch-icon-180.png", size: 180 },
        { name: "apple-touch-icon-152.png", size: 152 },
        { name: "apple-touch-icon-120.png", size: 120 },
        { name: "apple-touch-icon-76.png", size: 76 },
      ];
      for (const t of targets) {
        const dest = path.join(pwaIconsDir, t.name);
        const tmp = dest + ".tmp";
        if (t.padding) {
          // Maskable: contenido al 80% centrado con safe zone
          const inner = Math.round(t.size * 0.8);
          const buf = await sharp(masterPath)
            .resize(inner, inner, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
            .png()
            .toBuffer();
          await sharp({
            create: { width: t.size, height: t.size, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 1 } },
          })
            .composite([{ input: buf, gravity: "center" }])
            .png()
            .toFile(tmp);
        } else {
          await sharp(masterPath)
            .resize(t.size, t.size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
            .png()
            .toFile(tmp);
        }
        fs.renameSync(tmp, dest);
      }
    }
  } catch (e: any) {
    console.log("No se pudieron generar iconos PWA:", e.message);
  }

  emitBroadcast("config:updated", {
    keys: [LOGO_KEY],
    configVersion,
    logoVersion,
  });

  // Auto-regenerar shortcut Windows con el nuevo logo
  if (process.platform === "win32" && process.env.AUTO_SHORTCUT !== "false") {
    try {
      const { spawn } = require("child_process");
      const repoRoot = path.join(__dirname, "..", "..", "..", "..");
      const child = spawn(
        process.platform === "win32" ? "npm.cmd" : "npm",
        ["run", "shortcut"],
        { cwd: repoRoot, detached: true, stdio: "ignore", shell: true },
      );
      child.unref();
    } catch (e: any) {
      console.warn(`[config] auto-shortcut falló: ${e.message}`);
    }
  }

  return res.json({ logoUrl, logoVersion, configVersion });
}

export async function getManifest(_req: Request, res: Response) {
  let logo = "/pwa/icons/icon-any-512.png";
  let name = "POS";
  try {
    await configCache.ensureLoaded();
    const all = configCache.getAll();
    if (all.business_logo) logo = all.business_logo;
    if (all.business_name) name = all.business_name;
  } catch {}
  res.json({
    name,
    short_name: name,
    description: "Sistema de Punto de Venta con balanza digital",
    start_url: "/",
    scope: "/",
    display: "standalone",
    id: "/",
    orientation: "any",
    background_color: "#f3f4f6",
    theme_color: "#ffffff",
    lang: "es",
    icons: [
      { src: "/pwa/icons/icon-any-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/pwa/icons/icon-any-384.png", sizes: "384x384", type: "image/png", purpose: "any" },
      { src: "/pwa/icons/icon-any-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/pwa/icons/icon-any-128.png", sizes: "128x128", type: "image/png", purpose: "any" },
      { src: "/pwa/icons/icon-any-96.png", sizes: "96x96", type: "image/png", purpose: "any" },
      { src: "/pwa/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/pwa/icons/icon-maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      {
        name: "Punto de Venta",
        short_name: "POS",
        url: "/",
        icons: [{ src: "/pwa/icons/icon-any-96.png", sizes: "96x96", type: "image/png" }],
      },
      {
        name: "Dashboard",
        short_name: "Dashboard",
        url: "/dashboard",
        icons: [{ src: "/pwa/icons/icon-any-96.png", sizes: "96x96", type: "image/png" }],
      },
    ],
  });
}
