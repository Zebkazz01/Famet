import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth";
import { asyncHandler } from "../../middleware/asyncHandler";
import { resolve, history, remove, assignToProduct } from "./barcodes.controller";

const router = Router();

router.get("/resolve/:code", authenticate, asyncHandler(resolve));
router.get("/history", authenticate, authorize("ADMIN", "SUPERVISOR"), asyncHandler(history));
router.post("/assign", authenticate, authorize("ADMIN", "SUPERVISOR"), asyncHandler(assignToProduct));
router.delete("/:id", authenticate, authorize("ADMIN"), asyncHandler(remove));

export default router;
