import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth";
import { getKPIs } from "./dashboard.controller";

const router = Router();

router.get("/kpis", authenticate, authorize("ADMIN", "SUPERVISOR"), getKPIs);

export default router;
