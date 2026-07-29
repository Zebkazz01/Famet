import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth";
import { asyncHandler } from "../../middleware/asyncHandler";
import {
  listForProduct, listAll, createRule, updateRule, deleteRule, previewDiscount,
} from "./discounts.controller";

// Router montado en /api/discount-rules
const router = Router();
router.get("/", authenticate, authorize("ADMIN", "SUPERVISOR"), asyncHandler(listAll));
router.post("/", authenticate, authorize("ADMIN", "SUPERVISOR"), asyncHandler(createRule));
router.put("/:id", authenticate, authorize("ADMIN", "SUPERVISOR"), asyncHandler(updateRule));
router.delete("/:id", authenticate, authorize("ADMIN"), asyncHandler(deleteRule));
router.post("/preview", authenticate, asyncHandler(previewDiscount));
export default router;

// Router para sub-ruta de producto: /api/products/:id/discount-rules
export const productDiscountRulesRouter = Router();
productDiscountRulesRouter.get("/:id/discount-rules", authenticate, asyncHandler(listForProduct));
