import { prisma } from "../config/database";
import * as configCache from "../utils/configCache";
import * as cronManager from "./cronManager";
import { log } from "../config/logger";

async function runCleanup() {
  const retention = configCache.getNumber("notification_retention_days", 60);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - retention);

  const result = await prisma.notification.deleteMany({
    where: {
      deleted: true,
      createdAt: { lt: cutoff },
    },
  });
  if (result.count > 0) log.info(`[notifCleanup] ${result.count} notificaciones purgadas (> ${retention} días)`);
}

export function registerNotificationCleanupJob() {
  cronManager.register("notificationCleanup", "0 3 * * *", runCleanup);
}

export { runCleanup };
