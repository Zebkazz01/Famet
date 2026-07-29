import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth";
import { asyncHandler } from "../../middleware/asyncHandler";
import { list, unreadCount, patch, markAllRead, remove, create } from "./notifications.controller";

const router = Router();

router.get("/", authenticate, asyncHandler(list));
router.get("/unread-count", authenticate, asyncHandler(unreadCount));
router.patch("/mark-all-read", authenticate, asyncHandler(markAllRead));
router.patch("/:id", authenticate, asyncHandler(patch));
router.delete("/:id", authenticate, asyncHandler(remove));
// Crear notificación manualmente (testeo / sistema). Solo ADMIN.
router.post("/", authenticate, authorize("ADMIN"), asyncHandler(create));

export default router;
