import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth";
import { resolve, history, remove, assignToProduct } from "./barcodes.controller";

const router = Router();

router.get("/resolve/:code", authenticate, resolve);
router.get("/history", authenticate, authorize("ADMIN", "SUPERVISOR"), history);
router.post("/assign", authenticate, authorize("ADMIN", "SUPERVISOR"), assignToProduct);
router.delete("/:id", authenticate, authorize("ADMIN"), remove);

export default router;
