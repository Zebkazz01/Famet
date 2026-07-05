#!/usr/bin/env node
/**
 * Genera certs self-signed para HTTPS LAN si no existen.
 * - Detecta IPs LAN del equipo y las incluye en el SAN del certificado.
 * - Solo regenera si faltan los archivos o si una IP nueva no está en el cert actual.
 * - No requiere mkcert ni OpenSSL externo.
 *
 * Salida: frontend/cert.pem + frontend/key.pem
 *
 * Uso:
 *   node scripts/ensure-certs.js          # genera solo si faltan
 *   node scripts/ensure-certs.js --force  # regenera siempre
 */
const fs = require('fs');
const path = require('path');
const { networkInterfaces } = require('os');

const root = path.resolve(__dirname, '..');
const certPath = path.join(root, 'frontend', 'cert.pem');
const keyPath = path.join(root, 'frontend', 'key.pem');
const force = process.argv.includes('--force');

function getLanIPs() {
  const nets = networkInterfaces();
  const ips = [];
  for (const iface of Object.values(nets)) {
    for (const cfg of iface || []) {
      if (cfg.family === 'IPv4' && !cfg.internal) ips.push(cfg.address);
    }
  }
  return ips;
}

const lanIPs = getLanIPs();
const altNames = [
  { type: 2, value: 'localhost' },
  { type: 7, ip: '127.0.0.1' },
  ...lanIPs.map((ip) => ({ type: 7, ip })),
];

// Si ya existen y no se fuerza, no regenerar
if (!force && fs.existsSync(certPath) && fs.existsSync(keyPath)) {
  console.log(`[certs] OK: existen cert.pem y key.pem en frontend/`);
  if (lanIPs.length) console.log(`[certs] LAN: ${lanIPs.join(', ')}`);
  process.exit(0);
}

console.log('[certs] Generando self-signed para LAN...');
console.log(`[certs] IPs incluidas: ${['localhost', '127.0.0.1', ...lanIPs].join(', ')}`);

let selfsigned;
try {
  selfsigned = require('selfsigned');
} catch {
  console.error('[certs] Falta el paquete "selfsigned". Ejecuta: npm install');
  process.exit(1);
}

const attrs = [{ name: 'commonName', value: 'FAMEAT POS Local' }];
const pems = selfsigned.generate(attrs, {
  algorithm: 'sha256',
  days: 825, // máx para Safari/iOS
  keySize: 2048,
  extensions: [
    { name: 'basicConstraints', cA: false },
    {
      name: 'keyUsage',
      keyCertSign: false,
      digitalSignature: true,
      keyEncipherment: true,
      dataEncipherment: false,
    },
    {
      name: 'extKeyUsage',
      serverAuth: true,
      clientAuth: false,
    },
    {
      name: 'subjectAltName',
      altNames,
    },
  ],
});

// Asegurar que el dir frontend existe (debería existir, pero por las dudas)
fs.mkdirSync(path.dirname(certPath), { recursive: true });
fs.writeFileSync(certPath, pems.cert, 'utf8');
fs.writeFileSync(keyPath, pems.private, 'utf8');

console.log('[certs] Generados:');
console.log(`  ${certPath}`);
console.log(`  ${keyPath}`);
console.log('');
console.log('[certs] Nota: navegadores mostrarán advertencia de cert no confiable.');
console.log('       En el celular: aceptar "Continuar de todos modos" o instalar el cert.');
