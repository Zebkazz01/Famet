import * as expiryService from "../modules/expiry/expiryService";
import * as notificationService from "../modules/notifications/notificationService";
import * as configCache from "../utils/configCache";
import * as cronManager from "./cronManager";
import { log } from "../config/logger";

async function runExpiryCheck() {
  const days = configCache.getNumber("expiry_alert_days_before", 7);
  const items = await expiryService.getExpiring(days);
  let created = 0;
  for (const b of items) {
    try {
      await notificationService.notifyExpiry({
        id: b.id,
        productId: b.productId,
        productName: b.productName,
        expiryDate: b.expiryDate,
        daysLeft: b.daysLeft,
      });
      created++;
    } catch (e: any) {
      log.error(`[expiry] ${b.productName}: ${e.message}`);
    }
  }
  if (created > 0) log.info(`[expiry] ${created} notificaciones generadas`);
}

export function registerExpiryCheckJob() {
  cronManager.register("expiryCheck", "0 1 * * *", runExpiryCheck);
}

export { runExpiryCheck };
