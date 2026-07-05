import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth";
import {
  listForProduct, listAll, createRule, updateRule, deleteRule, previewDiscount,
} from "./discounts.controller";

// Router montado en /api/discount-rules
const router = Router();
router.get("/", authenticate, authorize("ADMIN", "SUPERVISOR"), listAll);
router.post("/", authenticate, authorize("ADMIN", "SUPERVISOR"), createRule);
router.put("/:id", authenticate, authorize("ADMIN", "SUPERVISOR"), updateRule);
router.delete("/:id", authenticate, authorize("ADMIN"), deleteRule);
router.post("/preview", authenticate, previewDiscount);
export default router;

// Router para sub-ruta de producto: /api/products/:id/discount-rules
export const productDiscountRulesRouter = Router();
productDiscountRulesRouter.get("/:id/discount-rules", authenticate, listForProduct);
