import { describe, it, expect, beforeAll, vi, beforeEach } from "vitest";
import request from "supertest";
import express from "express";
import jwt from "jsonwebtoken";
import { Decimal } from "@prisma/client/runtime/library";

// ── Mock objects (defined BEFORE vi.mock so they're available when hoisted) ──
vi.mock("../../../config/env", () => ({
  env: {
    JWT_SECRET: "test-secret-for-integration",
    JWT_EXPIRES_IN: "1h",
    PORT: 3001,
    SCALE_PORT: "COM3",
    SCALE_BAUD_RATE: 9600,
    BUSINESS_NAME: "POS",
    BUSINESS_ADDRESS: "",
    BUSINESS_PHONE: "",
    LOG_LEVEL: "info",
  },
}));

vi.mock("../../../config/database", () => {
  const mockPrisma = {
    $connect: vi.fn(),
    $disconnect: vi.fn(),
    $transaction: vi.fn((fn: any) => fn(mockPrisma)),
    $queryRaw: vi.fn().mockResolvedValue([{ "?column?": 1 }]),
    user: {
      findUnique: vi.fn(),
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn().mockResolvedValue(1),
    },
    product: {
      findUnique: vi.fn(),
      findMany: vi.fn().mockResolvedValue([]),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    category: {
      findUnique: vi.fn(),
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn(),
    },
    sale: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn().mockResolvedValue([]),
      update: vi.fn(),
      delete: vi.fn(),
    },
    saleItem: {
      create: vi.fn(),
      deleteMany: vi.fn(),
    },
    inventoryMovement: {
      create: vi.fn(),
      updateMany: vi.fn(),
      findMany: vi.fn().mockResolvedValue([]),
    },
    customer: {
      findUnique: vi.fn(),
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn(),
      update: vi.fn(),
    },
    cashMovement: {
      create: vi.fn(),
      findMany: vi.fn().mockResolvedValue([]),
    },
    productDiscountRule: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    notification: {
      create: vi.fn(),
    },
  };
  return { prisma: mockPrisma };
});

vi.mock("../../../modules/notifications/notificationService", () => ({
  create: vi.fn().mockResolvedValue({}),
}));

vi.mock("../../../modules/discounts/discountEngine", () => ({
  evaluate: vi.fn().mockReturnValue({ items: [], totalDiscount: 0, totalGross: 0, totalNet: 0 }),
}));

vi.mock("../../../modules/expiry/expiryService", () => ({
  consumeFromBatches: vi.fn(),
}));

vi.mock("../../../utils/configCache", () => ({
  get: vi.fn().mockReturnValue(null),
  set: vi.fn(),
  ensureLoaded: vi.fn(),
}));

// Mock bcryptjs so we can control compare results
const { bcryptCompare } = vi.hoisted(() => ({
  bcryptCompare: vi.fn(),
}));
vi.mock("bcryptjs", () => ({
  default: { compare: bcryptCompare, hash: vi.fn() },
  compare: bcryptCompare,
  hash: vi.fn(),
}));

// ── Now import modules (prisma is already mocked) ──
import { prisma } from "../../../config/database";
import authRoutes from "../../auth/auth.routes";
import salesRoutes from "../sales.routes";
import { errorHandler } from "../../../middleware/errorHandler";

const mockPrisma = prisma as any;

// ── Build a minimal Express app with the routes we need ──
function buildApp() {
  const app = express();
  app.use(express.json());
  app.use("/api/auth", authRoutes);
  app.use("/api/sales", salesRoutes);
  app.use(errorHandler);
  return app;
}

// ── Helpers ──
const JWT_SECRET = "test-secret-for-integration";

function makeToken(userId: number, role: string) {
  return jwt.sign({ userId, role }, JWT_SECRET, { expiresIn: "1h" });
}

// ── Test data ──
const adminUser = {
  id: 1,
  username: "admin",
  firstName: "Admin",
  lastName: "Test",
  password: "$2a$10$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWXYZ012",
  role: "ADMIN",
  status: "ACTIVE",
  email: "",
  phone: "",
  cedula: "0000000000",
  recoveryCode: "ABC123",
};

const testProduct = {
  id: 10,
  name: "Bistec de Res",
  saleType: "WEIGHT",
  price: new Decimal(22000),
  stockQty: new Decimal(50),
  cost: new Decimal(15000),
  active: true,
  minStock: 5,
  categoryId: 1,
  hasBatches: false,
  unitsPerPack: null,
  weightUnit: "kg",
  animalType: "RES",
};

const saleResponse = {
  id: 100,
  userId: 1,
  subtotal: new Decimal(44000),
  total: new Decimal(44000),
  discountTotal: new Decimal(0),
  paymentMethod: "CASH",
  amountPaid: new Decimal(50000),
  changeAmount: new Decimal(6000),
  isCredit: false,
  customerId: null,
  creditBalance: new Decimal(0),
  dueDate: null,
  createdAt: new Date(),
  corrected: false,
  items: [
    {
      id: 1,
      productId: 10,
      quantity: new Decimal(2),
      unitPrice: new Decimal(22000),
      subtotal: new Decimal(44000),
      isSubUnit: false,
      discountAmount: new Decimal(0),
      discountRuleId: null,
      originalPrice: null,
      product: testProduct,
    },
  ],
  user: { firstName: "Admin", lastName: "Test" },
};

describe("Integration: Complete Sale Flow", () => {
  let app: express.Express;

  beforeAll(() => {
    process.env.JWT_SECRET = JWT_SECRET;
    app = buildApp();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ═══════════════════════════════════════════════════
  // STEP 1: Login → obtain JWT token
  // ═══════════════════════════════════════════════════
  it("POST /api/auth/login → returns JWT token", async () => {
    bcryptCompare.mockResolvedValue(true);
    mockPrisma.user.findUnique.mockResolvedValue(adminUser);

    const res = await request(app)
      .post("/api/auth/login")
      .send({ username: "admin", password: "admin123" });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.username).toBe("admin");
    expect(res.body.user.role).toBe("ADMIN");
  });

  it("POST /api/auth/login → rejects wrong password", async () => {
    bcryptCompare.mockResolvedValue(false);
    mockPrisma.user.findUnique.mockResolvedValue(adminUser);

    const res = await request(app)
      .post("/api/auth/login")
      .send({ username: "admin", password: "wrong" });

    expect(res.status).toBe(401);
    expect(res.body.error).toBeDefined();
  });

  // ═══════════════════════════════════════════════════
  // STEP 2: Create a sale (cash payment)
  // ═══════════════════════════════════════════════════
  it("POST /api/sales → creates sale, decrements stock, creates inventory movement", async () => {
    const token = makeToken(1, "ADMIN");

    mockPrisma.product.findUnique
      .mockResolvedValueOnce(testProduct)
      .mockResolvedValueOnce(testProduct);
    mockPrisma.sale.create.mockResolvedValue(saleResponse);
    mockPrisma.inventoryMovement.create.mockResolvedValue({});
    mockPrisma.inventoryMovement.updateMany.mockResolvedValue({ count: 1 });

    const res = await request(app)
      .post("/api/sales")
      .set("Authorization", `Bearer ${token}`)
      .send({
        items: [{ productId: 10, quantity: 2, unitPrice: 22000, isSubUnit: false }],
        paymentMethod: "CASH",
        amountPaid: 50000,
      });

    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.total).toBeDefined();

    expect(mockPrisma.product.update).toHaveBeenCalled();
    const updateCall = mockPrisma.product.update.mock.calls[0][0];
    expect(updateCall.where.id).toBe(10);

    expect(mockPrisma.inventoryMovement.create).toHaveBeenCalled();
    const movementCall = mockPrisma.inventoryMovement.create.mock.calls[0][0];
    expect(movementCall.data.type).toBe("SALE");
    expect(movementCall.data.productId).toBe(10);

    expect(mockPrisma.sale.create).toHaveBeenCalled();
  });

  // ═══════════════════════════════════════════════════
  // STEP 3: Create a credit sale
  // ═══════════════════════════════════════════════════
  it("POST /api/sales → creates credit sale with customer", async () => {
    const token = makeToken(1, "ADMIN");

    const customer = {
      id: 5,
      name: "María López",
      currentDebt: 0,
      creditLimit: 1000000,
      active: true,
    };

    mockPrisma.product.findUnique.mockResolvedValueOnce(testProduct);
    mockPrisma.customer.findUnique.mockResolvedValueOnce(customer);

    const creditSale = {
      ...saleResponse,
      id: 101,
      isCredit: true,
      customerId: 5,
      amountPaid: new Decimal(10000),
      changeAmount: new Decimal(0),
      creditBalance: new Decimal(12000),
    };
    mockPrisma.sale.create.mockResolvedValueOnce(creditSale);
    mockPrisma.inventoryMovement.create.mockResolvedValue({});
    mockPrisma.inventoryMovement.updateMany.mockResolvedValue({ count: 1 });

    const res = await request(app)
      .post("/api/sales")
      .set("Authorization", `Bearer ${token}`)
      .send({
        items: [{ productId: 10, quantity: 1, unitPrice: 22000, isSubUnit: false }],
        paymentMethod: "CASH",
        amountPaid: 10000,
        isCredit: true,
        customerId: 5,
      });

    expect(res.status).toBe(201);
    expect(res.body.isCredit).toBe(true);

    expect(mockPrisma.customer.update).toHaveBeenCalled();
    const debtCall = mockPrisma.customer.update.mock.calls[0][0];
    expect(debtCall.where.id).toBe(5);
  });

  // ═══════════════════════════════════════════════════
  // STEP 4: Reject sale with insufficient stock
  // ═══════════════════════════════════════════════════
  it("POST /api/sales → rejects sale when UNIT product has insufficient stock", async () => {
    const token = makeToken(1, "ADMIN");

    const unitProduct = {
      id: 10,
      name: "Coca Cola 600ml",
      saleType: "UNIT",
      price: new Decimal(3200),
      stockQty: new Decimal(2),
      cost: new Decimal(2000),
      active: true,
      minStock: 5,
      categoryId: 7,
      hasBatches: false,
      unitsPerPack: null,
      weightUnit: null,
      animalType: null,
    };

    mockPrisma.product.findUnique.mockReset();
    mockPrisma.product.findUnique.mockResolvedValue(unitProduct);

    const res = await request(app)
      .post("/api/sales")
      .set("Authorization", `Bearer ${token}`)
      .send({
        items: [{ productId: 10, quantity: 5, unitPrice: 3200, isSubUnit: false }],
        paymentMethod: "CASH",
        amountPaid: 16000,
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/stock/i);
  });

  // ═══════════════════════════════════════════════════
  // STEP 5: Reject sale without auth
  // ═══════════════════════════════════════════════════
  it("POST /api/sales → 401 without token", async () => {
    const res = await request(app)
      .post("/api/sales")
      .send({
        items: [{ productId: 10, quantity: 1, unitPrice: 22000 }],
        paymentMethod: "CASH",
        amountPaid: 22000,
      });

    expect(res.status).toBe(401);
  });

  // ═══════════════════════════════════════════════════
  // STEP 6: VENDEDOR role can create sales
  // ═══════════════════════════════════════════════════
  it("POST /api/sales → VENDEDOR role can create sales", async () => {
    const token = makeToken(3, "VENDEDOR");

    mockPrisma.product.findUnique.mockResolvedValue(testProduct);
    mockPrisma.sale.create.mockResolvedValueOnce({ ...saleResponse, userId: 3 });
    mockPrisma.inventoryMovement.create.mockResolvedValue({});
    mockPrisma.inventoryMovement.updateMany.mockResolvedValue({ count: 1 });

    const res = await request(app)
      .post("/api/sales")
      .set("Authorization", `Bearer ${token}`)
      .send({
        items: [{ productId: 10, quantity: 1, unitPrice: 22000 }],
        paymentMethod: "CASH",
        amountPaid: 22000,
      });

    expect(res.status).toBe(201);
  });

  // ═══════════════════════════════════════════════════
  // STEP 7: Multiple items in one sale
  // ═══════════════════════════════════════════════════
  it("POST /api/sales → handles multiple items in single sale", async () => {
    const token = makeToken(1, "ADMIN");

    const product2 = { ...testProduct, id: 11, name: "Pechuga de Pollo", price: new Decimal(9500), stockQty: new Decimal(30) };

    mockPrisma.product.findUnique
      .mockResolvedValueOnce(testProduct)
      .mockResolvedValueOnce(product2);

    mockPrisma.sale.create.mockResolvedValueOnce({
      ...saleResponse,
      id: 102,
      subtotal: 53500,
      total: 53500,
      items: [
        { ...saleResponse.items[0], productId: 10 },
        { ...saleResponse.items[0], id: 2, productId: 11, quantity: 1, unitPrice: 9500, subtotal: 9500 },
      ],
    });
    mockPrisma.inventoryMovement.create.mockResolvedValue({});
    mockPrisma.inventoryMovement.updateMany.mockResolvedValue({ count: 2 });

    const res = await request(app)
      .post("/api/sales")
      .set("Authorization", `Bearer ${token}`)
      .send({
        items: [
          { productId: 10, quantity: 2, unitPrice: 22000 },
          { productId: 11, quantity: 1, unitPrice: 9500 },
        ],
        paymentMethod: "CASH",
        amountPaid: 54000,
      });

    expect(res.status).toBe(201);
    expect(mockPrisma.product.update).toHaveBeenCalledTimes(2);
    expect(mockPrisma.inventoryMovement.create).toHaveBeenCalledTimes(2);
  });
});
