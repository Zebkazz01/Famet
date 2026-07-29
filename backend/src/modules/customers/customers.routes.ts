import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth";
import { asyncHandler } from "../../middleware/asyncHandler";
import * as ctrl from "./customers.controller";

const router = Router();

router.use(authenticate);

router.get("/", asyncHandler(ctrl.list));
router.get("/:id", asyncHandler(ctrl.getOne));
router.post("/", authorize("ADMIN", "SUPERVISOR"), asyncHandler(ctrl.create));
router.put("/:id", authorize("ADMIN", "SUPERVISOR"), asyncHandler(ctrl.update));
router.delete("/:id", authorize("ADMIN"), asyncHandler(ctrl.remove));

// Pagos / abonos
router.get("/payments/list", asyncHandler(ctrl.listPayments));
router.post("/payments", asyncHandler(ctrl.createPayment));

export default router;
