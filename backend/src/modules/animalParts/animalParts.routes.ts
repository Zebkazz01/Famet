import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth";
import { list, create, remove } from "./animalParts.controller";

const router = Router();

router.get("/", authenticate, list);
router.post("/", authenticate, authorize("ADMIN", "SUPERVISOR"), create);
router.delete("/:id", authenticate, authorize("ADMIN"), remove);

export default router;
