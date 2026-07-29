import { Router } from "express";
import multer from "multer";
import path from "path";
import { authenticate, authorize } from "../../middleware/auth";
import { asyncHandler } from "../../middleware/asyncHandler";
import { uploadsDir } from "../../utils/paths";
import {
  listExpenses, getExpense, createExpense, updateExpense, deleteExpense, summary,
} from "./expenses.controller";

const router = Router();

const dir = uploadsDir("expenses");

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, dir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || ".bin";
    const stamp = Date.now() + "-" + Math.random().toString(36).slice(2, 8);
    cb(null, `evidence-${stamp}${ext}`);
  },
});

const ALLOWED_MIME = new Set([
  "image/jpeg", "image/png", "image/webp", "image/gif",
  "application/pdf",
]);

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME.has(file.mimetype)) {
      return cb(new Error("Tipo de archivo no permitido (solo imágenes y PDF)"));
    }
    cb(null, true);
  },
});

router.get("/summary", authenticate, authorize("ADMIN", "SUPERVISOR", "VENDEDOR"), asyncHandler(summary));
router.get("/", authenticate, authorize("ADMIN", "SUPERVISOR", "VENDEDOR"), asyncHandler(listExpenses));
router.get("/:id", authenticate, authorize("ADMIN", "SUPERVISOR", "VENDEDOR"), asyncHandler(getExpense));
router.post("/", authenticate, authorize("ADMIN", "SUPERVISOR", "VENDEDOR"), upload.single("evidence"), asyncHandler(createExpense));
router.put("/:id", authenticate, authorize("ADMIN", "SUPERVISOR", "VENDEDOR"), upload.single("evidence"), asyncHandler(updateExpense));
router.delete("/:id", authenticate, authorize("ADMIN"), asyncHandler(deleteExpense));

export default router;
