import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth";
import { asyncHandler } from "../../middleware/asyncHandler";
import { validate } from "../../middleware/validate";
import { createCategorySchema, updateCategorySchema } from "./categories.schema";
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from "./categories.controller";

const router = Router();

router.get("/", authenticate, asyncHandler(getCategories));
router.post("/", authenticate, authorize("ADMIN"), validate(createCategorySchema), asyncHandler(createCategory));
router.put("/:id", authenticate, authorize("ADMIN"), validate(updateCategorySchema), asyncHandler(updateCategory));
router.delete("/:id", authenticate, authorize("ADMIN"), asyncHandler(deleteCategory));

export default router;
