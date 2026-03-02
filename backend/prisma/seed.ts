import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // Crear usuario admin
  const adminPassword = await bcrypt.hash("admin123", 10);
  await prisma.user.upsert({
    where: { username: "admin" },
    update: {},
    create: {
      username: "admin",
      password: adminPassword,
      name: "Administrador",
      role: "ADMIN",
    },
  });

  // Crear cajero de ejemplo
  const cashierPassword = await bcrypt.hash("cajero123", 10);
  await prisma.user.upsert({
    where: { username: "cajero1" },
    update: {},
    create: {
      username: "cajero1",
      password: cashierPassword,
      name: "Cajero 1",
      role: "CASHIER",
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
      { name: "Bistec de Res", saleType: "WEIGHT" as const, price: 180, categoryId: carnes.id, minStock: 5 },
      { name: "Molida de Res", saleType: "WEIGHT" as const, price: 140, categoryId: carnes.id, minStock: 5 },
      { name: "Costilla de Res", saleType: "WEIGHT" as const, price: 160, categoryId: carnes.id, minStock: 3 },
      { name: "Chorizo Rojo", saleType: "WEIGHT" as const, price: 120, categoryId: embutidos.id, minStock: 3 },
      { name: "Longaniza", saleType: "WEIGHT" as const, price: 110, categoryId: embutidos.id, minStock: 3 },
      { name: "Jamón", saleType: "WEIGHT" as const, price: 90, categoryId: embutidos.id, minStock: 2 },
      { name: "Pechuga de Pollo", saleType: "WEIGHT" as const, price: 95, categoryId: pollo.id, minStock: 5 },
      { name: "Muslo de Pollo", saleType: "WEIGHT" as const, price: 65, categoryId: pollo.id, minStock: 5 },
      { name: "Coca Cola 600ml", saleType: "UNIT" as const, price: 20, categoryId: bebidas.id, minStock: 10, stockQty: 24 },
      { name: "Agua 1L", saleType: "UNIT" as const, price: 15, categoryId: bebidas.id, minStock: 10, stockQty: 24 },
    ];

    for (const prod of products) {
      const existing = await prisma.product.findFirst({ where: { name: prod.name } });
      if (!existing) {
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
    { key: "business_name", value: "FAMEAT" },
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
