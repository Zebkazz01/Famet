#!/usr/bin/env node

/**
 * FAMEAT POS - Demo Script
 *
 * Seeds the database with realistic demo data:
 *   - 3 users (admin, supervisor, vendedor)
 *   - 8 product categories
 *   - 10 products (weight + unit)
 *   - 8 customers with credit
 *   - ~300 sales across 30 days
 *   - ~40 expenses
 *   - Inventory entries, batches, credit payments
 *   - Processing batch (meat cutting)
 *
 * Usage:
 *   npm run demo              # from root
 *   npx ts-node scripts/demo.ts
 */

import { execSync } from "child_process";
import path from "path";

const rootDir = path.resolve(__dirname, "..");

console.log("");
console.log("\x1b[1m\x1b[36m  ==============================================\x1b[0m");
console.log("\x1b[1m\x1b[36m           FAMEAT POS — Demo Data Loader\x1b[0m");
console.log("\x1b[1m\x1b[36m  ==============================================\x1b[0m");
console.log("");
console.log("  This will seed the database with realistic demo data:");
console.log("  - Users, categories, products, customers");
console.log("  - 30 days of sales, expenses, inventory movements");
console.log("  - Processing batches and credit payments");
console.log("");

try {
  console.log("\x1b[33m  Running prisma db seed...\x1b[0m");
  execSync("npx prisma db seed", {
    cwd: path.join(rootDir, "backend"),
    stdio: "inherit",
    env: { ...process.env, NODE_ENV: "development" },
  });

  console.log("");
  console.log("\x1b[1m\x1b[32m  Demo data loaded successfully!\x1b[0m");
  console.log("");
  console.log("  \x1b[1mTest accounts:\x1b[0m");
  console.log("    admin / admin123     (ADMIN)");
  console.log("    supervisor1 / super123 (SUPERVISOR)");
  console.log("    cajero1 / cajero123   (VENDEDOR)");
  console.log("");
  console.log("  Start the server: npm run dev");
  console.log("");
} catch (err) {
  console.error("\x1b[31m  Failed to seed demo data\x1b[0m");
  console.error(err);
  process.exit(1);
}
