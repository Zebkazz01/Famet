#!/usr/bin/env node
/**
 * Cross-platform installer dispatcher.
 * Detecta SO y ejecuta el script nativo (setup.ps1 en Windows, setup.sh en Unix).
 * Uso: npm run setup
 */
const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const root = path.resolve(__dirname, '..');
const isWin = process.platform === 'win32';
const script = isWin ? 'setup.ps1' : 'setup.sh';
const scriptPath = path.join(root, script);

if (!fs.existsSync(scriptPath)) {
  console.error(`[setup] script no encontrado: ${scriptPath}`);
  process.exit(1);
}

console.log(`[setup] plataforma: ${process.platform}  → ${script}`);

const result = isWin
  ? spawnSync('powershell', ['-ExecutionPolicy', 'Bypass', '-File', scriptPath], { stdio: 'inherit', cwd: root })
  : spawnSync('bash', [scriptPath], { stdio: 'inherit', cwd: root });

process.exit(result.status ?? 0);
