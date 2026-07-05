import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth";
import { list, unreadCount, patch, markAllRead, remove, create } from "./notifications.controller";

const router = Router();

router.get("/", authenticate, list);
router.get("/unread-count", authenticate, unreadCount);
router.patch("/mark-all-read", authenticate, markAllRead);
router.patch("/:id", authenticate, patch);
router.delete("/:id", authenticate, remove);
// Crear notificación manualmente (testeo / sistema). Solo ADMIN.
router.post("/", authenticate, authorize("ADMIN"), create);

export default router;
