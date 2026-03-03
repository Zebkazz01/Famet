import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { createMovementSchema } from "./inventory.schema";
import { createMovement, getMovements, getAlerts } from "./inventory.controller";

const router = Router();

router.get("/movements", authenticate, authorize("ADMIN", "SUPERVISOR"), getMovements);
router.post("/movements", authenticate, authorize("ADMIN", "SUPERVISOR"), validate(createMovementSchema), createMovement);
router.get("/alerts", authenticate, authorize("ADMIN", "SUPERVISOR"), getAlerts);

export default router;
