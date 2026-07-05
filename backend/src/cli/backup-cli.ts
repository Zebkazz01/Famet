#!/usr/bin/env node
/**
 * CLI de backup/restore. Se ejecuta con tsx o node desde dist.
 *
 *   npm run backup:run            → genera backup ahora
 *   npm run backup:list           → lista backups
 *   npm run backup:restore <file> → restaura el backup indicado
 *   npm run backup:restore <file> --clean → drop + restore (limpia BD primero)
 */
import "dotenv/config";
import { runBackup, listBackups, restoreBackup } from "../jobs/backupJob";

async function main() {
  const cmd = process.argv[2];

  if (!cmd || cmd === "help" || cmd === "--help") {
    console.log(`
Backup CLI

Comandos:
  run                          Generar backup ahora
  list                         Listar backups disponibles
  restore <archivo>            Restaurar backup (genera safety backup antes)
  restore <archivo> --clean    Restaurar con DROP de objetos existentes

Ejemplos:
  npm run backup:run
  npm run backup:list
  npm run backup:restore fameat_pos_2026-06-03_140530.dump
  npm run backup:restore fameat_pos_2026-06-03_140530.dump --clean
`);
    process.exit(0);
  }

  if (cmd === "run") {
    const r = await runBackup();
    console.log(`OK  ${r.file}  (${(r.size / 1024).toFixed(1)} KB)`);
    process.exit(0);
  }

  if (cmd === "list") {
    const items = listBackups();
    if (items.length === 0) { console.log("Sin backups."); process.exit(0); }
    for (const f of items) {
      const kb = (f.size / 1024).toFixed(1);
      console.log(`  ${f.modifiedAt.toISOString().slice(0, 19).replace("T", " ")}  ${kb.padStart(8)} KB  ${f.name}`);
    }
    process.exit(0);
  }

  if (cmd === "restore") {
    const fileName = process.argv[3];
    if (!fileName) {
      console.error("Falta nombre del archivo. Uso: npm run backup:restore <archivo>");
      console.error("Lista backups: npm run backup:list");
      process.exit(1);
    }
    const dropFirst = process.argv.includes("--clean");

    console.log(`\n⚠️  PELIGROSO: vas a restaurar ${fileName}${dropFirst ? " con --clean (DROP objetos)" : ""}.`);
    console.log("    Se generará un backup de seguridad antes.\n");

    if (!process.argv.includes("--yes")) {
      const readline = await import("readline");
      const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
      const ans: string = await new Promise((r) => rl.question("Confirma escribiendo 'RESTAURAR': ", r));
      rl.close();
      if (ans.trim() !== "RESTAURAR") {
        console.log("Cancelado.");
        process.exit(0);
      }
    }

    const r = await restoreBackup(fileName, { dropFirst });
    console.log(`\n✓ Restaurado: ${r.restored}`);
    console.log(`  Backup de seguridad previo: ${r.safetyBackup}`);
    console.log("  Reinicia el servidor (npm start) para que tome los cambios.\n");
    process.exit(0);
  }

  console.error(`Comando desconocido: ${cmd}`);
  console.error("Usa 'npm run backup:help' para ver comandos disponibles.");
  process.exit(1);
}

main().catch((e) => {
  console.error("Error:", e.message);
  process.exit(1);
});
