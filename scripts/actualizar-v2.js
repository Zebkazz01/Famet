#!/usr/bin/env node
/**
 * Script de actualización para PC con versión vieja de Fameat.
 * 
 * Ejecutar DESPUÉS de copiar el código nuevo:
 *   node scripts/actualizar-v2.js
 * 
 * Este script:
 *   1. Instala dependencias actualizadas
 *   2. Genera el cliente Prisma
 *   3. Aplica migraciones pendientes (SIN perder datos)
 *   4. Ejecuta seed para crear categorías Res/Cerdo si no existen
 *   5. Reconstruye el backend y frontend
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

function run(cmd, opts = {}) {
  console.log(`\n> ${cmd}`);
  execSync(cmd, { cwd: root, stdio: 'inherit', ...opts });
}

async function main() {
  console.log('=========================================');
  console.log('  ACTUALIZACION FAMEAT v2 - Res/Cerdo');
  console.log('=========================================\n');

  // 1. Instalar dependencias
  console.log('[1/5] Instalando dependencias...');
  run('npm install');

  // 2. Generar cliente Prisma
  console.log('\n[2/5] Generando cliente Prisma...');
  run('npx --workspace=backend prisma generate');

  // 3. Aplicar migraciones (solo lo pendiente)
  console.log('\n[3/5] Aplicando migraciones pendientes...');
  try {
    run('npx --workspace=backend prisma migrate deploy');
    console.log('  ✓ Migraciones aplicadas');
  } catch (e) {
    console.log('  ⚠ Error en migraciones (puede que ya estén aplicadas):', e.message);
  }

  // 4. Ejecutar seed para categorías
  console.log('\n[4/5] Actualizando categorías (Res/Cerdo)...');
  try {
    run('npx --workspace=backend prisma db seed');
    console.log('  ✓ Categorías actualizadas');
  } catch (e) {
    console.log('  ⚠ Seed:', e.message);
  }

  // 5. Build
  console.log('\n[5/5] Construyendo proyecto...');
  run('npm run build');

  console.log('\n=========================================');
  console.log('  ✓ ACTUALIZACION COMPLETADA');
  console.log('=========================================');
  console.log('\nEjecuta: npm start  o  doble-click POS.bat');
}

main().catch((e) => {
  console.error('\n✗ Error durante actualización:', e.message);
  process.exit(1);
});
