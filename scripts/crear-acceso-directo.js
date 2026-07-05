#!/usr/bin/env node
/**
 * Crea un acceso directo en el Escritorio de Windows usando:
 *   - Nombre: business_name configurado (lee SystemConfig de la BD)
 *   - Icono : backend/uploads/logo/logo.png (logo del negocio) o PWA icon fallback
 *   - Target: POS.bat (lanzador raíz)
 *
 * Si ya hay un shortcut creado previamente (track en .last-shortcut.txt) y el
 * nombre cambió, lo borra para no dejar duplicados.
 *
 * Fallback si no hay DB/config: usa "POS" como nombre.
 *
 * Uso: npm run shortcut
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

if (process.platform !== 'win32') {
  console.error('[shortcut] Sólo Windows soportado.');
  process.exit(1);
}

const root = path.resolve(__dirname, '..');
const batPath = path.join(root, 'POS.bat');
const icoPath = path.join(root, 'POS.ico');
const trackerPath = path.join(root, '.last-shortcut.txt');

if (!fs.existsSync(batPath)) {
  console.error(`[shortcut] No existe ${batPath}. Asegúrate de tener POS.bat en la raíz.`);
  process.exit(1);
}

function sanitizeName(name) {
  return String(name)
    .replace(/[\\/:*?"<>|]+/g, '_')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80) || 'POS';
}

async function getBusinessName() {
  // Cargar .env de backend
  try {
    require('dotenv').config({ path: path.join(root, 'backend', '.env') });
  } catch {}
  // Importar Prisma del workspace backend
  // Probar varios paths posibles para Prisma (workspaces hoisting → puede estar en root o backend)
  const candidates = [
    path.join(root, 'backend', 'node_modules', '@prisma', 'client'),
    path.join(root, 'node_modules', '@prisma', 'client'),
  ];
  for (const p of candidates) {
    try {
      const { PrismaClient } = require(p);
      const prisma = new PrismaClient();
      const row = await prisma.systemConfig.findUnique({ where: { key: 'business_name' } });
      await prisma.$disconnect();
      if (row?.value) return row.value;
      return 'POS';
    } catch {
      // try next
    }
  }
  console.warn('[shortcut] No se pudo leer business_name (Prisma no disponible). Usando "POS".');
  return 'POS';
}

(async () => {
  const businessName = await getBusinessName();
  const displayName = sanitizeName(businessName);
  console.log(`[shortcut] Negocio: "${displayName}"`);

  // === 1. Generar ICO desde el logo ===
  const candidates = [
    path.join(root, 'backend', 'uploads', 'logo', 'logo.png'),
    path.join(root, 'frontend', 'public', 'pwa', 'icons', 'icon-any-512.png'),
    path.join(root, 'frontend', 'public', 'pwa', 'icons', 'icon-any-192.png'),
  ];
  const srcPng = candidates.find((p) => fs.existsSync(p));
  if (!srcPng) {
    console.error('[shortcut] No se encontró ningún PNG candidato para icono.');
    process.exit(1);
  }
  console.log(`[shortcut] Logo origen: ${srcPng}`);

  try {
    const sharp = require('sharp');
    const sizes = [16, 32, 48, 64, 128, 256];
    const tempDir = path.join(root, '.icon-tmp');
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);
    const tempFiles = [];
    for (const s of sizes) {
      const out = path.join(tempDir, `icon-${s}.png`);
      await sharp(srcPng)
        .resize(s, s, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
        .flatten({ background: { r: 255, g: 255, b: 255 } })
        .png()
        .toFile(out);
      tempFiles.push(out);
    }
    const mod = require('png-to-ico');
    const pngToIco = mod.default || mod;
    const buf = await pngToIco(tempFiles);
    fs.writeFileSync(icoPath, buf);
    for (const f of tempFiles) try { fs.unlinkSync(f); } catch {}
    try { fs.rmdirSync(tempDir); } catch {}
    console.log(`[shortcut] Icono generado: ${icoPath}`);
  } catch (e) {
    console.error('[shortcut] Error generando icono:', e.message);
    process.exit(1);
  }

  // === 2. Borrar shortcut anterior si nombre cambió ===
  const desktop = path.join(process.env.USERPROFILE || '', 'Desktop');
  const lnkPath = path.join(desktop, `${displayName}.lnk`);
  if (fs.existsSync(trackerPath)) {
    try {
      const prev = fs.readFileSync(trackerPath, 'utf-8').trim();
      if (prev && prev !== lnkPath && fs.existsSync(prev)) {
        fs.unlinkSync(prev);
        console.log(`[shortcut] Eliminado shortcut anterior: ${prev}`);
      }
    } catch {}
  }

  // === 3. Crear nuevo shortcut con PowerShell ===
  const ps = `
$ws = New-Object -ComObject WScript.Shell
$shortcut = $ws.CreateShortcut('${lnkPath.replace(/'/g, "''")}')
$shortcut.TargetPath = '${batPath.replace(/'/g, "''")}'
$shortcut.WorkingDirectory = '${root.replace(/'/g, "''")}'
$shortcut.IconLocation = '${icoPath.replace(/'/g, "''")}'
$shortcut.WindowStyle = 1
$shortcut.Description = '${displayName.replace(/'/g, "''")} - Punto de venta'
$shortcut.Save()
`.trim();

  try {
    execSync(
      `powershell -NoProfile -ExecutionPolicy Bypass -Command "${ps.replace(/\n/g, '; ').replace(/"/g, '\\"')}"`,
      { stdio: 'inherit' },
    );
    fs.writeFileSync(trackerPath, lnkPath);
    console.log(`[shortcut] Acceso directo creado: ${lnkPath}`);
    console.log('[shortcut] Listo. Doble-click al icono en el escritorio.');
  } catch (e) {
    console.error('[shortcut] Falló creando acceso directo:', e.message);
    process.exit(1);
  }
})();
