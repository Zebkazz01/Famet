import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth";
import { asyncHandler } from "../../middleware/asyncHandler";
import { list, create, remove } from "./animalParts.controller";

const router = Router();

router.get("/", authenticate, asyncHandler(list));
router.post("/", authenticate, authorize("ADMIN", "SUPERVISOR"), asyncHandler(create));
router.delete("/:id", authenticate, authorize("ADMIN"), asyncHandler(remove));

export default router;
