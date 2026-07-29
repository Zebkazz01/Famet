import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth";
import { asyncHandler } from "../../middleware/asyncHandler";
import { validate } from "../../middleware/validate";
import { createSupplierSchema, updateSupplierSchema } from "./suppliers.schema";
import { getSuppliers, getSupplier, createSupplier, updateSupplier, deleteSupplier } from "./suppliers.controller";

const router = Router();

router.get("/", authenticate, asyncHandler(getSuppliers));
router.get("/:id", authenticate, asyncHandler(getSupplier));
router.post("/", authenticate, authorize("ADMIN", "SUPERVISOR"), validate(createSupplierSchema), asyncHandler(createSupplier));
router.put("/:id", authenticate, authorize("ADMIN", "SUPERVISOR"), validate(updateSupplierSchema), asyncHandler(updateSupplier));
router.delete("/:id", authenticate, authorize("ADMIN"), asyncHandler(deleteSupplier));

export default router;
