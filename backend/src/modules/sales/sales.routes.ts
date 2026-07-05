import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { createSaleSchema, correctSaleSchema, updateSaleSchema } from "./sales.schema";
import { createSale, getSales, getSale, getDailySummary, correctSale, updateSale } from "./sales.controller";

const router = Router();

router.post("/", authenticate, authorize("ADMIN", "VENDEDOR"), validate(createSaleSchema), createSale);
router.put("/:id", authenticate, authorize("ADMIN", "VENDEDOR"), validate(updateSaleSchema), updateSale);
router.get("/", authenticate, getSales);
router.get("/summary", authenticate, authorize("ADMIN", "SUPERVISOR"), getDailySummary);
router.get("/:id", authenticate, getSale);
router.patch("/:id/correct", authenticate, validate(correctSaleSchema), correctSale);

export default router;
