import { describe, it, expect } from "vitest";
import {
  createCustomerSchema,
  updateCustomerSchema,
  createPaymentSchema,
} from "../customers.schema";

describe("customers.schema", () => {
  describe("createCustomerSchema", () => {
    const valid = { name: "Juan Pérez" };

    it("accepts minimal valid customer", () => {
      expect(createCustomerSchema.safeParse(valid).success).toBe(true);
    });

    it("accepts full customer data", () => {
      expect(createCustomerSchema.safeParse({
        name: "Juan Pérez",
        phone: "3187226478",
        document: "1234567890",
        notes: "Cliente frecuente",
        creditLimit: 500000,
        discountPercent: 10,
      }).success).toBe(true);
    });

    it("rejects empty name", () => {
      expect(createCustomerSchema.safeParse({ name: "" }).success).toBe(false);
    });

    it("rejects negative creditLimit", () => {
      expect(createCustomerSchema.safeParse({ name: "Juan", creditLimit: -100 }).success).toBe(false);
    });

    it("rejects discount > 100%", () => {
      expect(createCustomerSchema.safeParse({ name: "Juan", discountPercent: 110 }).success).toBe(false);
    });

    it("rejects discount < 0%", () => {
      expect(createCustomerSchema.safeParse({ name: "Juan", discountPercent: -5 }).success).toBe(false);
    });

    it("applies default creditLimit", () => {
      const result = createCustomerSchema.parse(valid);
      expect(result.creditLimit).toBe(0);
    });
  });

  describe("updateCustomerSchema", () => {
    it("accepts partial update", () => {
      expect(updateCustomerSchema.safeParse({ phone: "3187226478" }).success).toBe(true);
    });

    it("accepts active field", () => {
      expect(updateCustomerSchema.safeParse({ active: false }).success).toBe(true);
    });
  });

  describe("createPaymentSchema", () => {
    const valid = {
      customerId: 1,
      amount: 50000,
    };

    it("accepts minimal payment", () => {
      expect(createPaymentSchema.safeParse(valid).success).toBe(true);
    });

    it("accepts full payment data", () => {
      expect(createPaymentSchema.safeParse({
        ...valid,
        saleId: 1,
        method: "CARD",
        reference: "Voucher-123",
        notes: "Pago parcial",
      }).success).toBe(true);
    });

    it("rejects zero amount", () => {
      expect(createPaymentSchema.safeParse({ ...valid, amount: 0 }).success).toBe(false);
    });

    it("rejects negative amount", () => {
      expect(createPaymentSchema.safeParse({ ...valid, amount: -100 }).success).toBe(false);
    });

    it("applies default method", () => {
      const result = createPaymentSchema.parse(valid);
      expect(result.method).toBe("CASH");
    });

    it("accepts all payment methods", () => {
      for (const method of ["CASH", "CARD", "TRANSFER", "OTHER"]) {
        expect(createPaymentSchema.safeParse({ ...valid, method }).success).toBe(true);
      }
    });
  });
});
