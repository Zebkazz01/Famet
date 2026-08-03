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
    { name: "Res", color: "#DC2626" },
    { name: "Cerdo", color: "#F59E0B" },
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
  const res = await prisma.category.findUnique({ where: { name: "Res" } });
  const cerdo = await prisma.category.findUnique({ where: { name: "Cerdo" } });
  const embutidos = await prisma.category.findUnique({ where: { name: "Embutidos" } });
  const pollo = await prisma.category.findUnique({ where: { name: "Pollo" } });
  const bebidas = await prisma.category.findUnique({ where: { name: "Bebidas" } });

  if (res && cerdo && embutidos && pollo && bebidas) {
    const products = [
      { name: "Bistec de Res", saleType: "WEIGHT" as const, price: 22000, categoryId: res.id, minStock: 5, animalType: "RES" as const },
      { name: "Molida de Res", saleType: "WEIGHT" as const, price: 16000, categoryId: res.id, minStock: 5, animalType: "RES" as const },
      { name: "Costilla de Res", saleType: "WEIGHT" as const, price: 18000, categoryId: res.id, minStock: 3, animalType: "RES" as const },
      { name: "Chorizo Rojo", saleType: "WEIGHT" as const, price: 12000, categoryId: embutidos.id, minStock: 3, animalType: "CERDO" as const },
      { name: "Longaniza", saleType: "WEIGHT" as const, price: 11000, categoryId: embutidos.id, minStock: 3, animalType: "CERDO" as const },
      { name: "Jamón", saleType: "WEIGHT" as const, price: 9000, categoryId: embutidos.id, minStock: 2, animalType: "CERDO" as const },
      { name: "Pechuga de Pollo", saleType: "WEIGHT" as const, price: 9500, categoryId: pollo.id, minStock: 5, animalType: "POLLO" as const },
      { name: "Muslo de Pollo", saleType: "WEIGHT" as const, price: 6500, categoryId: pollo.id, minStock: 5, animalType: "POLLO" as const },
      { name: "Coca Cola 600ml", saleType: "UNIT" as const, price: 3200, categoryId: bebidas.id, minStock: 10, stockQty: 24 },
      { name: "Agua 1L", saleType: "UNIT" as const, price: 2500, categoryId: bebidas.id, minStock: 10, stockQty: 24 },
    ];

    for (const prod of products) {
      const existing = await prisma.product.findFirst({ where: { name: prod.name } });
      if (existing) {
        await prisma.product.update({
          where: { id: existing.id },
          data: { 
            price: prod.price, 
            saleType: prod.saleType, 
            minStock: prod.minStock || 0,
            categoryId: prod.categoryId,
            ...(prod.animalType ? { animalType: prod.animalType } : {}),
          },
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
            ...(prod.animalType ? { animalType: prod.animalType } : {}),
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

  // ═══════════════════════════════════════════════════════════════
  // DEMO DATA — Ventas, gastos, movimientos, clientes, crédito
  // ═══════════════════════════════════════════════════════════════

  const adminUser = await prisma.user.findFirst({ where: { username: "admin" } });
  const cajeroUser = await prisma.user.findFirst({ where: { username: "cajero1" } });
  const vendorUser = cajeroUser || adminUser;
  if (!adminUser) throw new Error("Admin no encontrado");

  const allProducts = await prisma.product.findMany({ where: { active: true } });
  const productMap = new Map(allProducts.map((p) => [p.name, p]));

  // Helper: random int between min and max (inclusive)
  const rand = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
  const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

  // ── Customers ──
  const customerNames = [
    "María López", "Carlos Rodríguez", "Ana Martínez", "Pedro Gómez",
    "Laura Sánchez", "Jorge Hernández", "Diana Ramírez", "Fernando Torres",
  ];
  const customers = [];
  for (const name of customerNames) {
    const existing = await prisma.customer.findFirst({ where: { name } });
    if (!existing) {
      const c = await prisma.customer.create({
        data: {
          name,
          phone: `3${rand(100, 999)}${rand(1000, 9999)}`,
          creditLimit: pick([500000, 1000000, 1500000]),
          currentDebt: 0,
        },
      });
      customers.push(c);
    } else {
      customers.push(existing);
    }
  }

  // ── Generate sales for last 30 days ──
  const now = new Date();
  const saleProducts = allProducts.filter((p) => p.price > 0);
  const paymentMethods: Array<"CASH" | "CARD" | "TRANSFER"> = ["CASH", "CARD", "TRANSFER"];

  console.log("  Generando ventas de los últimos 30 días...");
  let salesCreated = 0;

  for (let dayOffset = 29; dayOffset >= 0; dayOffset--) {
    const day = new Date(now);
    day.setDate(day.getDate() - dayOffset);
    day.setHours(0, 0, 0, 0);

    // 5-15 sales per day
    const salesToday = rand(5, 15);
    for (let s = 0; s < salesToday; s++) {
      const hour = rand(7, 20);
      const minute = rand(0, 59);
      const saleDate = new Date(day);
      saleDate.setHours(hour, minute, 0, 0);

      // 1-4 items per sale
      const itemCount = rand(1, 4);
      const items: Array<{ product: typeof saleProducts[0]; qty: number; price: number }> = [];
      for (let i = 0; i < itemCount; i++) {
        const prod = pick(saleProducts);
        const qty = prod.saleType === "UNIT" ? rand(1, 6) : +(Math.random() * 3 + 0.3).toFixed(3);
        items.push({ product: prod, qty, price: Number(prod.price) });
      }

      const subtotal = items.reduce((s, it) => s + it.qty * it.price, 0);
      const total = Math.round(subtotal);
      const isCredit = Math.random() < 0.12; // 12% credit
      const payMethod = isCredit ? "CASH" : pick(paymentMethods);
      const customer = isCredit ? pick(customers) : null;

      const sale = await prisma.sale.create({
        data: {
          userId: vendorUser!.id,
          subtotal: total,
          total,
          discountTotal: 0,
          paymentMethod: payMethod,
          amountPaid: isCredit ? Math.round(total * 0.5) : total,
          changeAmount: 0,
          isCredit,
          customerId: customer?.id || null,
          creditBalance: isCredit ? Math.round(total * 0.5) : 0,
          dueDate: isCredit ? new Date(day.getTime() + 15 * 86400000) : null,
          createdAt: saleDate,
          items: {
            create: items.map((it) => ({
              productId: it.product.id,
              quantity: it.qty,
              unitPrice: it.price,
              subtotal: Math.round(it.qty * it.price),
            })),
          },
        },
      });

      // Inventory movements for each item
      for (const it of items) {
        const prev = Number(it.product.stockQty);
        const newQty = +(prev - it.qty).toFixed(3);
        await prisma.inventoryMovement.create({
          data: {
            productId: it.product.id,
            type: "SALE",
            quantity: it.qty,
            previousQty: prev,
            newQty: Math.max(0, newQty),
            saleId: sale.id,
            userId: vendorUser!.id,
            notes: `Venta #${sale.id}`,
            createdAt: saleDate,
          },
        });
        await prisma.product.update({
          where: { id: it.product.id },
          data: { stockQty: Math.max(0, newQty) },
        });
      }

      // Update customer debt
      if (isCredit && customer) {
        const newDebt = +(Number(customer.currentDebt) + Math.round(total * 0.5)).toFixed(2);
        await prisma.customer.update({
          where: { id: customer.id },
          data: { currentDebt: newDebt },
        });
      }

      salesCreated++;
    }
  }
  console.log("  OK " + salesCreated + " ventas creadas");

  // ── Expenses ──
  console.log("  Generando gastos...");
  const expenseCategories = ["Arriendo", "Servicios públicos", "Nómina", "Transporte", "Empaque", "Mantenimiento", "Impuestos"];
  let expensesCreated = 0;

  for (let dayOffset = 29; dayOffset >= 0; dayOffset--) {
    const day = new Date(now);
    day.setDate(day.getDate() - dayOffset);
    // 0-3 expenses per day
    const expToday = rand(0, 3);
    for (let e = 0; e < expToday; e++) {
      const cat = pick(expenseCategories);
      const amounts: Record<string, [number, number]> = {
        "Arriendo": [800000, 800000],
        "Servicios públicos": [150000, 400000],
        "Nómina": [400000, 600000],
        "Transporte": [20000, 80000],
        "Empaque": [10000, 50000],
        "Mantenimiento": [30000, 150000],
        "Impuestos": [100000, 300000],
      };
      const [min, max] = amounts[cat] || [10000, 100000];
      const amount = rand(min, max);
      const expDate = new Date(day);
      expDate.setHours(rand(8, 18), rand(0, 59), 0, 0);

      await prisma.expense.create({
        data: {
          amount,
          description: `${cat} - ${day.toLocaleDateString("es-CO")}`,
          category: cat,
          date: expDate,
          userId: adminUser.id,
          paymentMethod: pick(["CASH", "TRANSFER"]),
          createdAt: expDate,
        },
      });
      expensesCreated++;
    }
  }
  console.log("  OK " + expensesCreated + " gastos creados");

  // ── Stock replenishment entries ──
  console.log("  Generando entradas de inventario...");
  let entriesCreated = 0;
  for (let dayOffset = 29; dayOffset >= 0; dayOffset -= rand(3, 7)) {
    const day = new Date(now);
    day.setDate(day.getDate() - dayOffset);
    const entryDate = new Date(day);
    entryDate.setHours(6, 0, 0, 0);

    for (const prod of saleProducts.slice(0, rand(3, 7))) {
      const prev = Number(prod.stockQty);
      const addQty = +(Math.random() * 20 + 5).toFixed(3);
      const newQty = +(prev + addQty).toFixed(3);

      await prisma.inventoryMovement.create({
        data: {
          productId: prod.id,
          type: "ENTRY",
          quantity: addQty,
          previousQty: prev,
          newQty,
          userId: adminUser.id,
          notes: "Reposición de inventario",
          createdAt: entryDate,
        },
      });
      await prisma.product.update({
        where: { id: prod.id },
        data: { stockQty: newQty },
      });
      entriesCreated++;
    }
  }
  console.log("  OK " + entriesCreated + " entradas de inventario creadas");

  // ── Product batches with expiring dates ──
  console.log("  Generando lotes...");
  const batchProducts = allProducts.filter((p) => p.saleType === "WEIGHT").slice(0, 5);
  let batchesCreated = 0;
  for (const prod of batchProducts) {
    // Create 2-3 batches per product
    for (let b = 0; b < rand(2, 3); b++) {
      const expiry = new Date(now);
      expiry.setDate(expiry.getDate() + rand(-5, 20)); // some expired, some expiring soon
      const qty = +(Math.random() * 10 + 2).toFixed(3);

      await prisma.productBatch.create({
        data: {
          productId: prod.id,
          batchCode: `LOT-${prod.id}-${b + 1}`,
          expiryDate: expiry,
          qty,
          notes: `Lote de demo ${prod.name}`,
        },
      });
      batchesCreated++;
    }
  }
  console.log("  OK " + batchesCreated + " lotes creados");

  // ── Credit payments (some customers pay partial) ──
  console.log("  Generando abonos de crédito...");
  let paymentsCreated = 0;
  for (const cust of customers) {
    if (Number(cust.currentDebt) > 100000) {
      const creditSales = await prisma.sale.findMany({
        where: { customerId: cust.id, isCredit: true },
        orderBy: { createdAt: "asc" },
      });
      for (const sale of creditSales.slice(0, 2)) {
        const payAmount = Math.min(
          Math.round(Number(sale.creditBalance) * rand(30, 70) / 100),
          Number(sale.creditBalance)
        );
        if (payAmount > 0) {
          await prisma.customerPayment.create({
            data: {
              customerId: cust.id,
              saleId: sale.id,
              amount: payAmount,
              method: "CASH",
              userId: adminUser.id,
              createdAt: new Date(now.getTime() - rand(1, 10) * 86400000),
            },
          });
          await prisma.sale.update({
            where: { id: sale.id },
            data: { creditBalance: +(Number(sale.creditBalance) - payAmount).toFixed(2) },
          });
          await prisma.customer.update({
            where: { id: cust.id },
            data: { currentDebt: +(Number(cust.currentDebt) - payAmount).toFixed(2) },
          });
          paymentsCreated++;
        }
      }
    }
  }
  console.log("  OK " + paymentsCreated + " abonos de crédito creados");

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
