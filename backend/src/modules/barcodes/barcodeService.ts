import { prisma } from "../../config/database";

/**
 * Registra/actualiza alias de código de barras → categoría.
 * Llamado desde products.controller cuando se guarda un producto con barcode.
 */
export async function registerAlias(barcode: string, categoryId: number, productId: number) {
  const existing = await prisma.categoryBarcode.findUnique({ where: { barcode } });
  if (!existing) {
    return await prisma.categoryBarcode.create({
      data: {
        barcode,
        categoryId,
        lastProductId: productId,
      },
    });
  }
  return await prisma.categoryBarcode.update({
    where: { barcode },
    data: {
      categoryId, // permite re-categorización si cambió
      lastProductId: productId,
      lastSeenAt: new Date(),
      timesSeen: { increment: 1 },
      status: "ACTIVE",
    },
  });
}

/**
 * Resuelve un código escaneado. Devuelve:
 * - producto activo asociado (lastProduct) si existe y está activo
 * - alternativa sugerida: producto activo más reciente en la misma categoría
 * - lista de alias conocidos para esa categoría
 */
export async function resolve(code: string) {
  const alias = await prisma.categoryBarcode.findUnique({
    where: { barcode: code },
    include: {
      category: true,
      lastProduct: true,
    },
  });

  // Producto exacto por barcode actual (campo barcode en Product)
  const exactProduct = await prisma.product.findUnique({
    where: { barcode: code },
    include: { category: true, supplier: true },
  });

  if (!alias && !exactProduct) {
    return {
      isNew: true,
      code,
      category: null,
      exactProduct: null,
      lastProduct: null,
      suggestedProduct: null,
      knownAliases: [],
    };
  }

  const categoryId = alias?.categoryId ?? exactProduct?.categoryId;
  const category = alias?.category ?? exactProduct?.category ?? null;

  // Sugerencia: producto activo más reciente en la misma categoría
  let suggestedProduct = null;
  if (categoryId) {
    suggestedProduct = await prisma.product.findFirst({
      where: { categoryId, active: true },
      include: { category: true, supplier: true },
      orderBy: { updatedAt: "desc" },
    });
  }

  const knownAliases = categoryId
    ? await prisma.categoryBarcode.findMany({
        where: { categoryId },
        orderBy: { lastSeenAt: "desc" },
        take: 10,
      })
    : [];

  return {
    isNew: false,
    code,
    category,
    exactProduct,
    lastProduct: alias?.lastProduct ?? null,
    suggestedProduct,
    knownAliases,
  };
}
