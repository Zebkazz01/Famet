import { describe, it, expect } from "vitest";
import { createCashMovementSchema, createCashClosingSchema } from "../cash.schema";

describe("cash.schema", () => {
  describe("createCashMovementSchema", () => {
    const valid = {
      type: "CASH_IN" as const,
      amount: 50000,
      reason: "Apertura de caja",
    };

    it("accepts valid CASH_IN", () => {
      expect(createCashMovementSchema.safeParse(valid).success).toBe(true);
    });

    it("accepts CASH_OUT", () => {
      expect(createCashMovementSchema.safeParse({ ...valid, type: "CASH_OUT" }).success).toBe(true);
    });

    it("rejects invalid type", () => {
      expect(createCashMovementSchema.safeParse({ ...valid, type: "INVALID" }).success).toBe(false);
    });

    it("rejects zero amount", () => {
      expect(createCashMovementSchema.safeParse({ ...valid, amount: 0 }).success).toBe(false);
    });

    it("rejects negative amount", () => {
      expect(createCashMovementSchema.safeParse({ ...valid, amount: -100 }).success).toBe(false);
    });

    it("rejects empty reason", () => {
      expect(createCashMovementSchema.safeParse({ ...valid, reason: "" }).success).toBe(false);
    });

    it("applies default source", () => {
      const result = createCashMovementSchema.parse(valid);
      expect(result.source).toBe("MANUAL");
    });
  });

  describe("createCashClosingSchema", () => {
    const valid = {
      expectedAmount: 200000,
      actualAmount: 195000,
    };

    it("accepts valid closing", () => {
      expect(createCashClosingSchema.safeParse(valid).success).toBe(true);
    });

    it("accepts zero amounts", () => {
      expect(createCashClosingSchema.safeParse({ expectedAmount: 0, actualAmount: 0 }).success).toBe(true);
    });

    it("rejects negative expectedAmount", () => {
      expect(createCashClosingSchema.safeParse({ ...valid, expectedAmount: -1 }).success).toBe(false);
    });

    it("rejects negative actualAmount", () => {
      expect(createCashClosingSchema.safeParse({ ...valid, actualAmount: -1 }).success).toBe(false);
    });

    it("accepts optional notes", () => {
      expect(createCashClosingSchema.safeParse({ ...valid, notes: "Faltante de $5000" }).success).toBe(true);
    });
  });
});
