import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth";
import * as ctrl from "./processing.controller";

const router = Router();

router.use(authenticate);

router.get("/summary", ctrl.summary);
router.get("/", ctrl.list);
router.get("/:id", ctrl.getOne);
router.get("/:id/analysis", ctrl.analysis);
router.post("/", authorize("ADMIN", "SUPERVISOR"), ctrl.create);
router.put("/:id", authorize("ADMIN", "SUPERVISOR"), ctrl.update);
router.post("/:id/complete", authorize("ADMIN", "SUPERVISOR"), ctrl.complete);
router.post("/:id/revert", authorize("ADMIN", "SUPERVISOR"), ctrl.revert);
router.post("/:id/cancel", authorize("ADMIN", "SUPERVISOR"), ctrl.cancel);
router.delete("/:id", authorize("ADMIN", "SUPERVISOR"), ctrl.remove);

export default router;
