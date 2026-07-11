import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { createCashMovementSchema, createCashClosingSchema } from "./cash.schema";
import {
  createCashMovement,
  getCashMovements,
  createCashClosing,
  getCashClosings,
  deleteCashMovement,
  deleteCashClosing,
} from "./cash.controller";

const router = Router();

// Movimientos de caja: VENDEDOR y ADMIN
router.post("/movement", authenticate, authorize("ADMIN", "VENDEDOR"), validate(createCashMovementSchema), createCashMovement);
router.get("/movements", authenticate, getCashMovements);
router.delete("/movement/:id", authenticate, authorize("ADMIN"), deleteCashMovement);

// Cierres de caja: SUPERVISOR y ADMIN
router.post("/closing", authenticate, authorize("ADMIN", "SUPERVISOR"), validate(createCashClosingSchema), createCashClosing);
router.get("/closings", authenticate, authorize("ADMIN", "SUPERVISOR"), getCashClosings);
router.delete("/closing/:id", authenticate, authorize("ADMIN"), deleteCashClosing);

export default router;
