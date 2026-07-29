import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth";
import { asyncHandler } from "../../middleware/asyncHandler";
import { validate } from "../../middleware/validate";
import { createSaleSchema, correctSaleSchema, updateSaleSchema } from "./sales.schema";
import { createSale, getSales, getSale, getDailySummary, correctSale, updateSale, deleteSale } from "./sales.controller";

const router = Router();

router.post("/", authenticate, authorize("ADMIN", "VENDEDOR"), validate(createSaleSchema), asyncHandler(createSale));
router.put("/:id", authenticate, authorize("ADMIN", "VENDEDOR"), validate(updateSaleSchema), asyncHandler(updateSale));
router.get("/", authenticate, asyncHandler(getSales));
router.get("/summary", authenticate, authorize("ADMIN", "SUPERVISOR"), asyncHandler(getDailySummary));
router.get("/:id", authenticate, asyncHandler(getSale));
router.patch("/:id/correct", authenticate, validate(correctSaleSchema), asyncHandler(correctSale));
router.delete("/:id", authenticate, authorize("ADMIN"), asyncHandler(deleteSale));

export default router;
