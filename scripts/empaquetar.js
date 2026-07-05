#!/usr/bin/env node
/**
 * Empaqueta el proyecto en un ZIP listo para transferir a otra PC.
 *
 * Excluye:
 *   - node_modules (en cualquier nivel)
 *   - dist (rebuildeable)
 *   - backups/ (datos locales)
 *   - backend/uploads/ (datos del negocio actual) — opcional, ver flags
 *   - backend/.env (secretos)
 *   - .git, .icon-tmp, .last-shortcut.txt
 *   - *.log, *.ico generado
 *
 * Salida: pos-<fecha>.zip en la carpeta padre del proyecto.
 *
 * Uso:
 *   npm run empaquetar                       # excluye uploads, certs y .env
 *   npm run empaquetar -- --uploads          # incluye uploads (logo, productos, etc.)
 *   npm run empaquetar -- --certs            # incluye cert.pem + key.pem
 *   npm run empaquetar -- --env              # incluye .env (CUIDADO: tiene passwords)
 *   npm run empaquetar -- --all              # incluye todo (uploads + certs + env)
 */
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

const root = path.resolve(__dirname, '..');
const all = process.argv.includes('--all');
const includeUploads = all || process.argv.includes('--uploads');
const includeCerts = all || process.argv.includes('--certs');
const includeEnv = all || process.argv.includes('--env');

const ts = new Date().toISOString().slice(0, 10).replace(/-/g, '');
const projectName = path.basename(root);
const outFile = path.join(path.dirname(root), `${projectName}-${ts}.zip`);

console.log(`[empaquetar] Origen: ${root}`);
console.log(`[empaquetar] Destino: ${outFile}`);
console.log(`[empaquetar] Incluir uploads: ${includeUploads ? 'si' : 'no'}`);
console.log(`[empaquetar] Incluir certs:   ${includeCerts ? 'si' : 'no'}`);
console.log(`[empaquetar] Incluir .env:    ${includeEnv ? 'si (OJO: passwords!)' : 'no'}`);
console.log('');

// Patrones a EXCLUIR (glob estilo minimatch)
const excludePatterns = [
  '**/node_modules/**',
  '**/dist/**',
  '**/.git/**',
  '**/.icon-tmp/**',
  '**/.last-shortcut.txt',
  '**/POS.ico',
  '**/*.log',
  '**/.DS_Store',
  '**/Thumbs.db',
  '**/.env.local',
  '**/.env.production',
  'backend/backups/**',
  'uploads/**',
  'null',
  '*.zip',
];

if (!includeEnv) {
  excludePatterns.push('**/.env');
}

if (!includeUploads) {
  // Excluir uploads de productos y gastos (datos del negocio actual),
  // pero conservar SIEMPRE el logo (es marca, no data).
  excludePatterns.push('backend/uploads/products/**');
  excludePatterns.push('backend/uploads/expenses/**');
}
if (!includeCerts) {
  excludePatterns.push('frontend/cert.pem');
  excludePatterns.push('frontend/key.pem');
}

const output = fs.createWriteStream(outFile);
const archive = archiver('zip', { zlib: { level: 9 } });

output.on('close', () => {
  const mb = (archive.pointer() / 1024 / 1024).toFixed(2);
  console.log('');
  console.log('==================================================');
  console.log(`  ✓ Paquete creado: ${path.basename(outFile)}`);
  console.log(`    Ruta: ${outFile}`);
  console.log(`    Tamaño: ${mb} MB`);
  console.log('==================================================');
  console.log('');
  console.log('Para usar en otra PC:');
  console.log(`  1. Descomprime ${path.basename(outFile)}`);
  console.log(`  2. cd ${projectName}`);
  console.log('  3. npm run setup       (instala todo y configura)');
  console.log('  4. npm start           (arranca el sistema)');
  console.log('     o doble-click a POS.bat');
  console.log('');
});

archive.on('warning', (err) => {
  if (err.code === 'ENOENT') console.warn(`[empaquetar] warning: ${err.message}`);
  else throw err;
});

archive.on('error', (err) => { throw err; });

archive.pipe(output);

// Agregar todo el directorio, excepto los patrones
// dot:true incluye .env.example, .gitignore, etc. Los .env/.git reales están en excludePatterns.
archive.glob('**/*', {
  cwd: root,
  ignore: excludePatterns,
  dot: true,
}, { prefix: projectName + '/' });

archive.finalize();
