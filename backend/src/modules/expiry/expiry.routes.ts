import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth";
import {
  expiring, listBatches, createBatch, updateBatch, deleteBatch,
} from "./expiry.controller";

// Router para endpoints generales /api/products/expiring y /api/batches/:id
export const expiryGeneralRouter = Router();
expiryGeneralRouter.get("/expiring", authenticate, expiring);
expiryGeneralRouter.put("/batches/:id", authenticate, authorize("ADMIN", "SUPERVISOR"), updateBatch);
expiryGeneralRouter.delete("/batches/:id", authenticate, authorize("ADMIN"), deleteBatch);

// Router montado bajo /api/products para batches por producto
const productBatchRouter = Router();
productBatchRouter.get("/:id/batches", authenticate, listBatches);
productBatchRouter.post("/:id/batches", authenticate, authorize("ADMIN", "SUPERVISOR"), createBatch);

export default productBatchRouter;
