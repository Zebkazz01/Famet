import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth";
import * as ctrl from "./customers.controller";

const router = Router();

router.use(authenticate);

router.get("/", ctrl.list);
router.get("/:id", ctrl.getOne);
router.post("/", authorize("ADMIN", "SUPERVISOR"), ctrl.create);
router.put("/:id", authorize("ADMIN", "SUPERVISOR"), ctrl.update);
router.delete("/:id", authorize("ADMIN"), ctrl.remove);

// Pagos / abonos
router.get("/payments/list", ctrl.listPayments);
router.post("/payments", ctrl.createPayment);

export default router;
