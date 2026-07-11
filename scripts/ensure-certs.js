#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { networkInterfaces } = require('os');
const { execSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const frontendDir = path.join(root, 'frontend');
const certPath = path.join(frontendDir, 'cert.pem');
const keyPath = path.join(frontendDir, 'key.pem');
const rootCAPath = path.join(frontendDir, 'public', 'rootCA.pem');
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

if (!force && fs.existsSync(certPath) && fs.existsSync(keyPath) && fs.existsSync(rootCAPath)) {
  process.exit(0);
}

const forge = require('node-forge');
const pki = forge.pki;

// 1. Root CA
const caKeys = pki.rsa.generateKeyPair(2048);
const caCert = pki.createCertificate();
caCert.publicKey = caKeys.publicKey;
caCert.serialNumber = '01';
caCert.validity.notBefore = new Date();
caCert.validity.notAfter = new Date();
caCert.validity.notAfter.setFullYear(caCert.validity.notBefore.getFullYear() + 10);

const caAttrs = [{ name: 'commonName', value: 'FAMEAT POS Root CA' }];
caCert.setSubject(caAttrs);
caCert.setIssuer(caAttrs);
caCert.setExtensions([
  { name: 'basicConstraints', cA: true, critical: true },
  { name: 'keyUsage', keyCertSign: true, cRLSign: true, critical: true },
]);
caCert.sign(caKeys.privateKey, forge.md.sha256.create());

// 2. Server cert
const serverKeys = pki.rsa.generateKeyPair(2048);
const serverCert = pki.createCertificate();
serverCert.publicKey = serverKeys.publicKey;
serverCert.serialNumber = '02';
serverCert.validity.notBefore = new Date();
serverCert.validity.notAfter = new Date();
serverCert.validity.notAfter.setFullYear(serverCert.validity.notBefore.getFullYear() + 5);

const serverAttrs = [{ name: 'commonName', value: 'FAMEAT POS' }];
serverCert.setSubject(serverAttrs);
serverCert.setIssuer(caAttrs);

const altNames = [
  { type: 2, value: 'localhost' },
  { type: 7, ip: '127.0.0.1' },
  ...lanIPs.map((ip) => ({ type: 7, ip })),
];
serverCert.setExtensions([
  { name: 'basicConstraints', cA: false },
  { name: 'keyUsage', digitalSignature: true, keyEncipherment: true },
  { name: 'extKeyUsage', serverAuth: true },
  { name: 'subjectAltName', altNames },
]);
serverCert.sign(caKeys.privateKey, forge.md.sha256.create());

// 3. Guardar
fs.mkdirSync(path.dirname(certPath), { recursive: true });
fs.mkdirSync(path.join(frontendDir, 'public'), { recursive: true });

fs.writeFileSync(certPath, pki.certificateToPem(serverCert), 'utf8');
fs.writeFileSync(keyPath, pki.privateKeyToPem(serverKeys.privateKey), 'utf8');
fs.writeFileSync(rootCAPath, pki.certificateToPem(caCert), 'utf8');

// 4. Instalar Root CA en Windows (opcional, falla silenciosamente sin admin)
if (process.platform === 'win32') {
  try {
    execSync(`certutil -addstore -f Root "${rootCAPath}"`, { stdio: 'pipe', timeout: 5000 });
  } catch {}
}
