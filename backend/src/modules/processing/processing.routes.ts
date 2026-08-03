import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth";
import { asyncHandler } from "../../middleware/asyncHandler";
import * as ctrl from "./processing.controller";

const router = Router();

router.use(authenticate);

router.get("/summary", asyncHandler(ctrl.summary));
router.get("/", asyncHandler(ctrl.list));
router.get("/:id", asyncHandler(ctrl.getOne));
router.get("/:id/analysis", asyncHandler(ctrl.analysis));
router.post("/", authorize("ADMIN", "SUPERVISOR"), asyncHandler(ctrl.create));
router.put("/:id", authorize("ADMIN", "SUPERVISOR"), asyncHandler(ctrl.update));
router.post("/:id/complete", authorize("ADMIN", "SUPERVISOR"), asyncHandler(ctrl.complete));
router.post("/:id/revert", authorize("ADMIN", "SUPERVISOR"), asyncHandler(ctrl.revert));
router.post("/:id/cancel", authorize("ADMIN", "SUPERVISOR"), asyncHandler(ctrl.cancel));
router.delete("/:id", authorize("ADMIN", "SUPERVISOR"), asyncHandler(ctrl.remove));

export default router;
