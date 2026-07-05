import { Router } from "express";
import multer from "multer";
import path from "path";
import { authenticate, authorize } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { uploadsDir as resolveUploadsDir } from "../../utils/paths";
import { createProductSchema, updateProductSchema } from "./products.schema";
import {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  getPriceHistory,
} from "./products.controller";

const uploadsDir = resolveUploadsDir("products");

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `product-${Date.now()}${ext}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

const router = Router();

router.get("/", authenticate, getProducts);
router.get("/:id", authenticate, getProduct);
router.get("/:id/price-history", authenticate, getPriceHistory);
router.post("/", authenticate, authorize("ADMIN", "SUPERVISOR"), validate(createProductSchema), createProduct);
router.put("/:id", authenticate, authorize("ADMIN", "SUPERVISOR"), validate(updateProductSchema), updateProduct);
router.delete("/:id", authenticate, authorize("ADMIN"), deleteProduct);

// Upload imagen de producto
router.post("/:id/image", authenticate, authorize("ADMIN", "SUPERVISOR"), upload.single("image"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No se envió imagen" });
  const id = Number(req.params.id);
  const imageUrl = `/uploads/products/${req.file.filename}`;
  const { prisma } = await import("../../config/database");
  await prisma.product.update({ where: { id }, data: { imageUrl } });
  return res.json({ imageUrl });
});

export default router;
