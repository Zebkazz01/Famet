import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth";
import * as ctrl from "./purchaseOrders.controller";

const router = Router();

router.use(authenticate);

router.get("/", ctrl.list);
router.get("/:id", ctrl.getOne);
router.post("/", authorize("ADMIN", "SUPERVISOR"), ctrl.create);
router.put("/:id", authorize("ADMIN", "SUPERVISOR"), ctrl.update);
router.post("/:id/receive", authorize("ADMIN", "SUPERVISOR"), ctrl.receive);
router.post("/:id/cancel", authorize("ADMIN", "SUPERVISOR"), ctrl.cancel);

export default router;
