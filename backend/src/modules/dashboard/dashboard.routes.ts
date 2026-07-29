import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth";
import { asyncHandler } from "../../middleware/asyncHandler";
import { getKPIs, getAnalytics } from "./dashboard.controller";

const router = Router();

router.get("/kpis", authenticate, authorize("ADMIN", "SUPERVISOR"), asyncHandler(getKPIs));
router.get("/analytics", authenticate, authorize("ADMIN", "SUPERVISOR"), asyncHandler(getAnalytics));

export default router;
