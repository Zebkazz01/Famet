import { prisma } from "../config/database";
import * as configCache from "../utils/configCache";
import * as notificationService from "../modules/notifications/notificationService";
import * as cronManager from "./cronManager";
import { log } from "../config/logger";

async function runLowStockCheck() {
  const enabled = configCache.getBool("low_stock_alert_enabled", true);
  if (!enabled) return;
  // Productos activos con stock <= minStock y minStock > 0
  const products = await prisma.product.findMany({
    where: {
      active: true,
      minStock: { gt: 0 },
    },
    select: { id: true, name: true, stockQty: true, minStock: true },
  });
  let created = 0;
  for (const p of products) {
    if (Number(p.stockQty) <= Number(p.minStock)) {
      try {
        await notificationService.notifyLowStock({
          id: p.id,
          name: p.name,
          stockQty: Number(p.stockQty),
          minStock: Number(p.minStock),
        });
        created++;
      } catch (e: any) {
        log.error(`[lowStock] ${p.name}: ${e.message}`);
      }
    }
  }
  if (created > 0) log.info(`[lowStock] ${created} notificaciones generadas`);
}

export function registerLowStockJob() {
  cronManager.register("lowStockCheck", "0 */4 * * *", runLowStockCheck);
}

export { runLowStockCheck };
