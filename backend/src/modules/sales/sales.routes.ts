import { Router } from "express";
import { authenticate } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { createSaleSchema } from "./sales.schema";
import { createSale, getSales, getSale, getDailySummary } from "./sales.controller";

const router = Router();

router.post("/", authenticate, validate(createSaleSchema), createSale);
router.get("/", authenticate, getSales);
router.get("/summary", authenticate, getDailySummary);
router.get("/:id", authenticate, getSale);

export default router;
