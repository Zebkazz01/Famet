import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth";
import { getKPIs, getAnalytics } from "./dashboard.controller";

const router = Router();

router.get("/kpis", authenticate, authorize("ADMIN", "SUPERVISOR"), getKPIs);
router.get("/analytics", authenticate, authorize("ADMIN", "SUPERVISOR"), getAnalytics);

export default router;
