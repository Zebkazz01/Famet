import { Router } from "express";
import multer from "multer";
import path from "path";
import { authenticate, authorize } from "../../middleware/auth";
import { asyncHandler } from "../../middleware/asyncHandler";
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
  getProductSalesCount,
  deletePriceHistory,
  mergeProduct,
  getTopSellers,
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

router.get("/", authenticate, asyncHandler(getProducts));
router.get("/top-sellers", authenticate, asyncHandler(getTopSellers));
router.get("/:id", authenticate, asyncHandler(getProduct));
router.get("/:id/price-history", authenticate, asyncHandler(getPriceHistory));
router.get("/:id/sales-count", authenticate, asyncHandler(getProductSalesCount));
router.delete("/:id/price-history/:historyId", authenticate, authorize("ADMIN"), asyncHandler(deletePriceHistory));
router.post("/", authenticate, authorize("ADMIN", "SUPERVISOR"), validate(createProductSchema), asyncHandler(createProduct));
router.put("/:id", authenticate, authorize("ADMIN", "SUPERVISOR"), validate(updateProductSchema), asyncHandler(updateProduct));
router.delete("/:id", authenticate, authorize("ADMIN"), asyncHandler(deleteProduct));
router.post("/merge", authenticate, authorize("ADMIN"), asyncHandler(mergeProduct));

// Upload imagen de producto
router.post("/:id/image", authenticate, authorize("ADMIN", "SUPERVISOR"), upload.single("image"), asyncHandler(async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No se envió imagen" });
  const id = Number(req.params.id);
  const imageUrl = `/uploads/products/${req.file.filename}`;
  const { prisma } = await import("../../config/database");
  await prisma.product.update({ where: { id }, data: { imageUrl } });
  return res.json({ imageUrl });
}));

export default router;
