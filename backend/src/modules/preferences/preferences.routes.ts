import { Router } from "express";
import { authenticate } from "../../middleware/auth";
import { asyncHandler } from "../../middleware/asyncHandler";
import { getAll, getOne, setOne, remove } from "./preferences.controller";

const router = Router();

router.get("/", authenticate, asyncHandler(getAll));
router.get("/:key", authenticate, asyncHandler(getOne));
router.put("/:key", authenticate, asyncHandler(setOne));
router.delete("/:key", authenticate, asyncHandler(remove));

export default router;
