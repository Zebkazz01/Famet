import { execSync, spawnSync } from 'child_process';
import { existsSync } from 'fs';
import { networkInterfaces } from 'os';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..', '..');

// Obtener todas las IPs LAN del equipo
function getLanIPs() {
  const nets = networkInterfaces();
  const ips = [];
  for (const iface of Object.values(nets)) {
    for (const cfg of iface || []) {
      if (cfg.family === 'IPv4' && !cfg.internal) {
        ips.push(cfg.address);
      }
    }
  }
  return ips;
}

const lanIPs = getLanIPs();
const sanEntries = ['localhost', ...lanIPs, '127.0.0.1'];

console.log(`\n  IPs detectadas: ${lanIPs.join(', ') || 'ninguna'}`);
console.log(`  Regenerando certificado para: ${sanEntries.join(', ')}\n`);

// Intentar primero con mkcert (certs trusted). Si falla, fallback a selfsigned.
let mkcertOk = false;
try {
  execSync(`mkcert -key-file key.pem -cert-file cert.pem ${sanEntries.join(' ')}`, {
    stdio: 'inherit',
    cwd: process.cwd(),
  });
  mkcertOk = true;
} catch {
  console.warn('  [aviso] mkcert no encontrado. Usando certs self-signed (mostrará advertencia en el navegador).');
  console.warn('         Para certs sin advertencia: winget install FiloSottile.mkcert && mkcert -install');
  // Fallback: usar scripts/ensure-certs.js para generar selfsigned
  const ensureScript = resolve(repoRoot, 'scripts', 'ensure-certs.js');
  if (existsSync(ensureScript)) {
    const r = spawnSync('node', [ensureScript, '--force'], {
      stdio: 'inherit',
      cwd: process.cwd(),
    });
    if (r.status !== 0) {
      console.error('  Error: no se pudo generar certs self-signed.');
      process.exit(1);
    }
  } else {
    console.error('  Error: scripts/ensure-certs.js no encontrado.');
    process.exit(1);
  }
}

if (mkcertOk) console.log('\n  Certs trusted generados con mkcert.\n');

// Iniciar Vite con HTTPS y host (puerto 5175 para mobile)
execSync('npx vite --port 5175 --host', {
  stdio: 'inherit',
  env: { ...process.env, VITE_HTTPS: 'true' },
});
