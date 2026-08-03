import { Router } from "express";
import { login } from "./auth.controller";
import { validate } from "../../middleware/validate";
import { loginSchema } from "./auth.schema";
import { asyncHandler } from "../../middleware/asyncHandler";

const router = Router();

router.post("/login", validate(loginSchema), asyncHandler(login));

export default router;
