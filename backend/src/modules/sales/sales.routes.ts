import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { createSaleSchema, correctSaleSchema } from "./sales.schema";
import { createSale, getSales, getSale, getDailySummary, correctSale } from "./sales.controller";

const router = Router();

router.post("/", authenticate, authorize("ADMIN", "VENDEDOR"), validate(createSaleSchema), createSale);
router.get("/", authenticate, getSales);
router.get("/summary", authenticate, authorize("ADMIN", "SUPERVISOR"), getDailySummary);
router.get("/:id", authenticate, getSale);
router.patch("/:id/correct", authenticate, validate(correctSaleSchema), correctSale);

export default router;
