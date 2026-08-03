import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth";
import { asyncHandler } from "../../middleware/asyncHandler";
import * as ctrl from "./purchaseOrders.controller";

const router = Router();

router.use(authenticate);

router.get("/", asyncHandler(ctrl.list));
router.get("/:id", asyncHandler(ctrl.getOne));
router.post("/", authorize("ADMIN", "SUPERVISOR"), asyncHandler(ctrl.create));
router.put("/:id", authorize("ADMIN", "SUPERVISOR"), asyncHandler(ctrl.update));
router.post("/:id/receive", authorize("ADMIN", "SUPERVISOR"), asyncHandler(ctrl.receive));
router.post("/:id/cancel", authorize("ADMIN", "SUPERVISOR"), asyncHandler(ctrl.cancel));

export default router;
