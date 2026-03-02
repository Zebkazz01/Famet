import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { createCategorySchema, updateCategorySchema } from "./categories.schema";
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from "./categories.controller";

const router = Router();

router.get("/", authenticate, getCategories);
router.post("/", authenticate, authorize("ADMIN"), validate(createCategorySchema), createCategory);
router.put("/:id", authenticate, authorize("ADMIN"), validate(updateCategorySchema), updateCategory);
router.delete("/:id", authenticate, authorize("ADMIN"), deleteCategory);

export default router;
