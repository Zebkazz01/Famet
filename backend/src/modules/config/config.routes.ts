import { Router } from "express";
import multer from "multer";
import path from "path";
import { authenticate, authorize } from "../../middleware/auth";
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
router.get("/public", getPublicConfig);
router.get("/version", getConfigVersion);

// Auth requerida
router.get("/", authenticate, getConfig);
router.put("/", authenticate, authorize("ADMIN"), updateConfig);
router.post("/logo", authenticate, authorize("ADMIN"), logoUpload.single("logo"), uploadLogo);

export default router;

// Manifest separado (montado en /api/manifest.json desde index.ts)
export const manifestHandler = getManifest;
