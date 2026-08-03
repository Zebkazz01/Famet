import { Router } from "express";
import multer from "multer";
import path from "path";
import { authenticate, authorize } from "../../middleware/auth";
import { asyncHandler } from "../../middleware/asyncHandler";
import { uploadsDir } from "../../utils/paths";
import {
  getConfig,
  getPublicConfig,
  updateConfig,
  uploadLogo,
  getConfigVersion,
  getManifest,
} from "./config.controller";

const router = Router();

// Setup multer para logo — siempre apunta a backend/uploads/logo (independiente del cwd)
const logoDir = uploadsDir("logo");
const logoStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, logoDir),
  filename: (_req, file, cb) => cb(null, `logo${path.extname(file.originalname)}`),
});
const logoUpload = multer({
  storage: logoStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
});

// Públicos
router.get("/public", asyncHandler(getPublicConfig));
router.get("/version", asyncHandler(getConfigVersion));

// Auth requerida
router.get("/", authenticate, asyncHandler(getConfig));
router.put("/", authenticate, authorize("ADMIN"), asyncHandler(updateConfig));
router.post("/logo", authenticate, authorize("ADMIN"), logoUpload.single("logo"), asyncHandler(uploadLogo));

export default router;

// Manifest separado (montado en /api/manifest.json desde index.ts)
export const manifestHandler = getManifest;
