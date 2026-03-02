import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { createProductSchema, updateProductSchema } from "./products.schema";
import {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
} from "./products.controller";

const router = Router();

router.get("/", authenticate, getProducts);
router.get("/:id", authenticate, getProduct);
router.post("/", authenticate, authorize("ADMIN"), validate(createProductSchema), createProduct);
router.put("/:id", authenticate, authorize("ADMIN"), validate(updateProductSchema), updateProduct);
router.delete("/:id", authenticate, authorize("ADMIN"), deleteProduct);

export default router;
