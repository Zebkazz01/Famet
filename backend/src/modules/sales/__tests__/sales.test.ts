import { describe, it, expect } from "vitest";
import { createSaleSchema, correctSaleSchema, updateSaleSchema } from "../sales.schema";

describe("sales.schema", () => {
  describe("createSaleSchema", () => {
    const validSale = {
      items: [{ productId: 1, quantity: 2, unitPrice: 10.5 }],
      paymentMethod: "CASH" as const,
      amountPaid: 21,
    };

    it("accepts valid cash sale", () => {
      expect(createSaleSchema.safeParse(validSale).success).toBe(true);
    });

    it("accepts CARD payment", () => {
      expect(createSaleSchema.safeParse({ ...validSale, paymentMethod: "CARD" }).success).toBe(true);
    });

    it("accepts TRANSFER payment", () => {
      expect(createSaleSchema.safeParse({ ...validSale, paymentMethod: "TRANSFER" }).success).toBe(true);
    });

    it("rejects invalid payment method", () => {
      expect(createSaleSchema.safeParse({ ...validSale, paymentMethod: "BITCOIN" }).success).toBe(false);
    });

    it("rejects empty items", () => {
      expect(createSaleSchema.safeParse({ ...validSale, items: [] }).success).toBe(false);
    });

    it("rejects item with zero quantity", () => {
      expect(createSaleSchema.safeParse({
        ...validSale,
        items: [{ productId: 1, quantity: 0, unitPrice: 10 }],
      }).success).toBe(false);
    });

    it("rejects item with negative price", () => {
      expect(createSaleSchema.safeParse({
        ...validSale,
        items: [{ productId: 1, quantity: 1, unitPrice: -5 }],
      }).success).toBe(false);
    });

    it("accepts credit sale", () => {
      expect(createSaleSchema.safeParse({
        ...validSale,
        isCredit: true,
        customerId: 1,
        dueDate: "2026-08-01",
      }).success).toBe(true);
    });

    it("applies defaults correctly", () => {
      const result = createSaleSchema.parse(validSale);
      expect(result.items[0].isSubUnit).toBe(false);
      expect(result.paymentStatus).toBe("CONFIRMED");
      expect(result.isCredit).toBe(false);
    });
  });

  describe("correctSaleSchema", () => {
    it("accepts correction with reason", () => {
      expect(correctSaleSchema.safeParse({ correctionReason: "Devolución" }).success).toBe(true);
    });

    it("rejects empty reason", () => {
      expect(correctSaleSchema.safeParse({ correctionReason: "" }).success).toBe(false);
    });
  });

  describe("updateSaleSchema", () => {
    it("accepts update with items and paymentMethod", () => {
      expect(updateSaleSchema.safeParse({
        items: [{ productId: 1, quantity: 2, unitPrice: 10 }],
        paymentMethod: "CARD",
      }).success).toBe(true);
    });

    it("accepts empty items for full return", () => {
      expect(updateSaleSchema.safeParse({ items: [] }).success).toBe(true);
    });

    it("rejects missing items", () => {
      expect(updateSaleSchema.safeParse({ paymentMethod: "CARD" }).success).toBe(false);
    });
  });
});
