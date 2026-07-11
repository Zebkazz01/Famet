import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { createMovementSchema } from "./inventory.schema";
import { createMovement, getMovements, getMovement, getAlerts, deleteMovement } from "./inventory.controller";

const router = Router();

router.get("/movements", authenticate, authorize("ADMIN", "SUPERVISOR"), getMovements);
router.get("/movements/:id", authenticate, authorize("ADMIN", "SUPERVISOR"), getMovement);
router.post("/movements", authenticate, authorize("ADMIN", "SUPERVISOR"), validate(createMovementSchema), createMovement);
router.delete("/movements/:id", authenticate, authorize("ADMIN"), deleteMovement);
router.get("/alerts", authenticate, authorize("ADMIN", "SUPERVISOR"), getAlerts);

export default router;
