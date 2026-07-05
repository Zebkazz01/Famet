import { Router } from "express";
import { authenticate } from "../../middleware/auth";
import { getAll, getOne, setOne, remove } from "./preferences.controller";

const router = Router();

router.get("/", authenticate, getAll);
router.get("/:key", authenticate, getOne);
router.put("/:key", authenticate, setOne);
router.delete("/:key", authenticate, remove);

export default router;
