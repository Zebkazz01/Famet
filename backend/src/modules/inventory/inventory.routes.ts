import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth";
import { asyncHandler } from "../../middleware/asyncHandler";
import { validate } from "../../middleware/validate";
import { createMovementSchema } from "./inventory.schema";
import { createMovement, getMovements, getMovement, getAlerts, deleteMovement } from "./inventory.controller";

const router = Router();

router.get("/movements", authenticate, authorize("ADMIN", "SUPERVISOR"), asyncHandler(getMovements));
router.get("/movements/:id", authenticate, authorize("ADMIN", "SUPERVISOR"), asyncHandler(getMovement));
router.post("/movements", authenticate, authorize("ADMIN", "SUPERVISOR"), validate(createMovementSchema), asyncHandler(createMovement));
router.delete("/movements/:id", authenticate, authorize("ADMIN"), asyncHandler(deleteMovement));
router.get("/alerts", authenticate, authorize("ADMIN", "SUPERVISOR"), asyncHandler(getAlerts));

export default router;
