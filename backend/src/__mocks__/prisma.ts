import { vi } from "vitest";

type Fn = (...args: any[]) => any;

function createChainable() {
  const chain: Record<string, Fn> = {};
  const self: any = new Proxy(
    {},
    {
      get(_target, prop: string) {
        if (prop === "then") return undefined;
        if (chain[prop]) return chain[prop];
        chain[prop] = vi.fn().mockReturnValue(self);
        return chain[prop];
      },
    }
  );
  return self;
}

export function createMockPrisma() {
  const modelMethods = [
    "findUnique",
    "findMany",
    "findFirst",
    "create",
    "update",
    "delete",
    "upsert",
    "count",
    "aggregate",
    "groupBy",
  ];

  const models = [
    "user",
    "product",
    "category",
    "sale",
    "saleItem",
    "inventoryMovement",
    "productBatch",
    "cashMovement",
    "cashClosing",
    "customer",
    "customerPayment",
    "supplier",
    "purchaseOrder",
    "expense",
    "config",
    "notification",
    "productDiscountRule",
    "priceHistory",
  ];

  const prisma: any = {
    $connect: vi.fn(),
    $disconnect: vi.fn(),
    $transaction: vi.fn((fns: any) => {
      if (Array.isArray(fns)) {
        return Promise.all(fns.map((fn: any) => fn(prisma)));
      }
      return typeof fns === "function" ? fns(prisma) : Promise.resolve(fns);
    }),
    $executeRaw: vi.fn().mockResolvedValue(0),
    $queryRaw: vi.fn().mockResolvedValue([]),
  };

  for (const model of models) {
    prisma[model] = {};
    for (const method of modelMethods) {
      prisma[model][method] = vi.fn().mockImplementation((..._args: any[]) => {
        if (method === "findMany") return Promise.resolve([]);
        if (method === "count") return Promise.resolve(0);
        if (method === "aggregate") return Promise.resolve({ _sum: {}, _avg: {}, _count: {} });
        if (method === "groupBy") return Promise.resolve([]);
        if (method === "findFirst") return Promise.resolve(null);
        if (method === "findUnique") return Promise.resolve(null);
        return Promise.resolve(createChainable());
      });
    }
  }

  return prisma;
}
