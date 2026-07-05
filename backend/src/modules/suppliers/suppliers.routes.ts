import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { createSupplierSchema, updateSupplierSchema } from "./suppliers.schema";
import { getSuppliers, getSupplier, createSupplier, updateSupplier, deleteSupplier } from "./suppliers.controller";

const router = Router();

router.get("/", authenticate, getSuppliers);
router.get("/:id", authenticate, getSupplier);
router.post("/", authenticate, authorize("ADMIN", "SUPERVISOR"), validate(createSupplierSchema), createSupplier);
router.put("/:id", authenticate, authorize("ADMIN", "SUPERVISOR"), validate(updateSupplierSchema), updateSupplier);
router.delete("/:id", authenticate, authorize("ADMIN"), deleteSupplier);

export default router;
