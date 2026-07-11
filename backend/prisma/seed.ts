import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const prisma = new PrismaClient();

function generateRecoveryCode(): string {
  return crypto.randomBytes(4).toString("hex").toUpperCase();
}

async function main() {
  // Crear usuario admin
  const adminPassword = await bcrypt.hash("admin123", 10);
  await prisma.user.upsert({
    where: { username: "admin" },
    update: {},
    create: {
      cedula: "0000000000",
      firstName: "Admin",
      lastName: "Sistema",
      phone: "",
      email: "",
      username: "admin",
      password: adminPassword,
      role: "ADMIN",
      status: "ACTIVE",
      recoveryCode: generateRecoveryCode(),
    },
  });

  // Crear supervisor de ejemplo
  const supervisorPassword = await bcrypt.hash("super123", 10);
  await prisma.user.upsert({
    where: { username: "supervisor1" },
    update: {},
    create: {
      cedula: "2222222222",
      firstName: "Supervisor",
      lastName: "Ejemplo",
      phone: "",
      email: "",
      username: "supervisor1",
      password: supervisorPassword,
      role: "SUPERVISOR",
      status: "ACTIVE",
      recoveryCode: generateRecoveryCode(),
    },
  });

  // Crear vendedor de ejemplo
  const vendedorPassword = await bcrypt.hash("cajero123", 10);
  await prisma.user.upsert({
    where: { username: "cajero1" },
    update: {},
    create: {
      cedula: "1111111111",
      firstName: "Cajero",
      lastName: "Ejemplo",
      phone: "",
      email: "",
      username: "cajero1",
      password: vendedorPassword,
      role: "VENDEDOR",
      status: "ACTIVE",
      recoveryCode: generateRecoveryCode(),
    },
  });

  // Categorías
  const categories = [
    { name: "Carnes", color: "#EF4444" },
    { name: "Embutidos", color: "#F97316" },
    { name: "Pollo", color: "#EAB308" },
    { name: "Mariscos", color: "#3B82F6" },
    { name: "Lácteos", color: "#F3F4F6" },
    { name: "Bebidas", color: "#22C55E" },
    { name: "Varios", color: "#8B5CF6" },
  ];

  for (const cat of categories) {
    await prisma.category.upsert({
      where: { name: cat.name },
      update: { color: cat.color },
      create: cat,
    });
  }

  // Productos de ejemplo
  const carnes = await prisma.category.findUnique({ where: { name: "Carnes" } });
  const embutidos = await prisma.category.findUnique({ where: { name: "Embutidos" } });
  const pollo = await prisma.category.findUnique({ where: { name: "Pollo" } });
  const bebidas = await prisma.category.findUnique({ where: { name: "Bebidas" } });

  if (carnes && embutidos && pollo && bebidas) {
    const products = [
      { name: "Bistec de Res", saleType: "WEIGHT" as const, price: 22000, categoryId: carnes.id, minStock: 5 },
      { name: "Molida de Res", saleType: "WEIGHT" as const, price: 16000, categoryId: carnes.id, minStock: 5 },
      { name: "Costilla de Res", saleType: "WEIGHT" as const, price: 18000, categoryId: carnes.id, minStock: 3 },
      { name: "Chorizo Rojo", saleType: "WEIGHT" as const, price: 12000, categoryId: embutidos.id, minStock: 3 },
      { name: "Longaniza", saleType: "WEIGHT" as const, price: 11000, categoryId: embutidos.id, minStock: 3 },
      { name: "Jamón", saleType: "WEIGHT" as const, price: 9000, categoryId: embutidos.id, minStock: 2 },
      { name: "Pechuga de Pollo", saleType: "WEIGHT" as const, price: 9500, categoryId: pollo.id, minStock: 5 },
      { name: "Muslo de Pollo", saleType: "WEIGHT" as const, price: 6500, categoryId: pollo.id, minStock: 5 },
      { name: "Coca Cola 600ml", saleType: "UNIT" as const, price: 3200, categoryId: bebidas.id, minStock: 10, stockQty: 24 },
      { name: "Agua 1L", saleType: "UNIT" as const, price: 2500, categoryId: bebidas.id, minStock: 10, stockQty: 24 },
    ];

    for (const prod of products) {
      const existing = await prisma.product.findFirst({ where: { name: prod.name } });
      if (existing) {
        await prisma.product.update({
          where: { id: existing.id },
          data: { price: prod.price, saleType: prod.saleType, minStock: prod.minStock || 0 },
        });
      } else {
        await prisma.product.create({
          data: {
            name: prod.name,
            saleType: prod.saleType,
            price: prod.price,
            categoryId: prod.categoryId,
            minStock: prod.minStock || 0,
            stockQty: prod.stockQty || 0,
          },
        });
      }
    }
  }

  // Configuración del sistema
  const configs = [
    { key: "scale_port", value: "COM3" },
    { key: "scale_baud_rate", value: "9600" },
    { key: "business_name", value: "Mi Negocio" },
    { key: "business_address", value: "" },
    { key: "business_phone", value: "" },
  ];

  for (const config of configs) {
    await prisma.systemConfig.upsert({
      where: { key: config.key },
      update: { value: config.value },
      create: config,
    });
  }

  // Procesamiento
  const resCutsCat = await prisma.category.findFirst({ where: { name: "Carnes" } });
  if (!resCutsCat) throw new Error("Categoría Carnes no encontrada");

  // Buscar productos ya existentes del seed anterior
  const existingBistec = await prisma.product.findFirst({ where: { name: "Bistec de Res" } });
  const existingMolida = await prisma.product.findFirst({ where: { name: "Molida de Res" } });
  const existingCostilla = await prisma.product.findFirst({ where: { name: "Costilla de Res" } });

  // Producto de entrada: media res (no existe en seed anterior)
  let mediaRes = await prisma.product.findFirst({ where: { name: "Media Res" } });
  if (!mediaRes) {
    mediaRes = await prisma.product.create({
      data: {
        name: "Media Res",
        saleType: "WEIGHT",
        price: 0,
        categoryId: resCutsCat.id,
        minStock: 0,
        stockQty: 250,
        weightUnit: "kg",
        animalType: "RES",
      },
    });
  }

  // Cortes: solo reusar los 3 productos existentes
  const cutProducts = [existingBistec, existingMolida, existingCostilla].filter(Boolean).map((p) => p!.id);

  // Crear proceso de ejemplo completo
  const admin = await prisma.user.findFirst({ where: { username: "admin" } });
  if (admin && mediaRes && cutProducts.length >= 3) {
    // Eliminar batch anterior si existe para regenerar con datos actualizados
    const oldBatch = await prisma.processingBatch.findFirst({
      where: { code: "PR-SEED-001" },
    });
    if (oldBatch) {
      await prisma.processingOutput.deleteMany({ where: { batchId: oldBatch.id } });
      await prisma.processingBatch.delete({ where: { id: oldBatch.id } });
    }
      const batch = await prisma.processingBatch.create({
        data: {
          code: "PR-SEED-001",
          animalType: "RES",
          inputProductId: mediaRes.id,
          inputWeightKg: 250,
          totalCost: 3850000,
          wasteWeightKg: 35,
          notes: "Media res de 250 kg procesada para inventario de carnes",
          processedBy: admin.id,
          status: "DRAFT",
          outputs: {
            create: [
              { productId: cutProducts[0], weightKg: 85, costPerKg: 0, totalCost: 0, salePricePerKg: 22000 },
              { productId: cutProducts[1], weightKg: 70, costPerKg: 0, totalCost: 0, salePricePerKg: 16000 },
              { productId: cutProducts[2], weightKg: 60, costPerKg: 0, totalCost: 0, salePricePerKg: 18000 },
            ],
          },
        },
        include: { outputs: true },
      });

      // Completar el proceso (replicando la lógica del endpoint complete)
      await prisma.$transaction(async (tx) => {
        const outputWeight = batch.outputs.reduce((s, o) => s + Number(o.weightKg), 0);
        const uniformCostKg = +(Number(batch.totalCost) / outputWeight).toFixed(2);
        let remainingCost = Number(batch.totalCost);

        for (let i = 0; i < batch.outputs.length; i++) {
          const output = batch.outputs[i];
          const weight = Number(output.weightKg);
          const isLast = i === batch.outputs.length - 1;

          let totalCost: number;
          if (isLast) {
            totalCost = +remainingCost.toFixed(2);
          } else {
            totalCost = +(uniformCostKg * weight).toFixed(2);
          }
          remainingCost -= totalCost;
          const costPerKg = weight > 0 ? +(totalCost / weight).toFixed(2) : 0;

          await tx.processingOutput.update({
            where: { id: output.id },
            data: { costPerKg, totalCost },
          });

          const prod = await tx.product.findUnique({ where: { id: output.productId } });
          if (prod) {
            const prevStock = Number(prod.stockQty);
            const prevCost = Number(prod.cost ?? 0);
            const newStock = +(prevStock + weight).toFixed(3);
            const newCost = newStock > 0
              ? +((prevCost * prevStock + totalCost) / newStock).toFixed(2)
              : +costPerKg.toFixed(2);

            await tx.product.update({
              where: { id: output.productId },
              data: { stockQty: newStock, cost: newCost },
            });

            await tx.inventoryMovement.create({
              data: {
                productId: output.productId,
                type: "PROCESSING_OUTPUT",
                quantity: weight,
                previousQty: prevStock,
                newQty: newStock,
                unitCost: +costPerKg.toFixed(2),
                totalValue: +totalCost.toFixed(2),
                notes: `Procesamiento ${batch.code}: RES`,
                userId: admin.id,
              },
            });
          }
        }

        const inputProd = await tx.product.findUnique({ where: { id: batch.inputProductId } });
        if (inputProd) {
          const prevInputStock = Number(inputProd.stockQty);
          const newInputStock = +(prevInputStock - Number(batch.inputWeightKg)).toFixed(3);
          await tx.product.update({
            where: { id: batch.inputProductId },
            data: { stockQty: Math.max(0, newInputStock) },
          });
          await tx.inventoryMovement.create({
            data: {
              productId: batch.inputProductId,
              type: "PROCESSING_INPUT",
              quantity: Number(batch.inputWeightKg),
              previousQty: prevInputStock,
              newQty: Math.max(0, newInputStock),
              unitCost: Number(batch.inputWeightKg) > 0
                ? +(Number(batch.totalCost) / Number(batch.inputWeightKg)).toFixed(2)
                : 0,
              totalValue: Number(batch.totalCost),
              notes: `Procesamiento ${batch.code}: consumido para desposte`,
              userId: admin.id,
            },
          });
        }

        await tx.processingBatch.update({
          where: { id: batch.id },
          data: { status: "COMPLETED", completedAt: new Date() },
        });
      });

      console.log("  ✓ Procesamiento de ejemplo creado: PR-SEED-001 (Media Res → 3 cortes)");
  }

  console.log("Seed completado exitosamente");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
