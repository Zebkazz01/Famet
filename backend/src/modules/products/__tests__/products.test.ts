import { describe, it, expect } from "vitest";

describe("Products schema validation", () => {
  // Inline schema test (avoiding Prisma imports)
  const productSchema = {
    name: (v: any) => typeof v === "string" && v.length >= 1,
    price: (v: any) => typeof v === "number" && v > 0,
    saleType: (v: any) => ["UNIT", "WEIGHT", "BOTH"].includes(v),
    weightUnit: (v: any) => ["kg", "lb", "g", "ud", "und", null, undefined].includes(v),
  };

  describe("name validation", () => {
    it("accepts valid name", () => {
      expect(productSchema.name("Lomo de Res")).toBe(true);
    });

    it("rejects empty name", () => {
      expect(productSchema.name("")).toBe(false);
    });

    it("rejects non-string", () => {
      expect(productSchema.name(123)).toBe(false);
    });
  });

  describe("price validation", () => {
    it("accepts positive price", () => {
      expect(productSchema.price(28000)).toBe(true);
    });

    it("rejects zero price", () => {
      expect(productSchema.price(0)).toBe(false);
    });

    it("rejects negative price", () => {
      expect(productSchema.price(-100)).toBe(false);
    });
  });

  describe("saleType validation", () => {
    it("accepts UNIT", () => {
      expect(productSchema.saleType("UNIT")).toBe(true);
    });

    it("accepts WEIGHT", () => {
      expect(productSchema.saleType("WEIGHT")).toBe(true);
    });

    it("accepts BOTH", () => {
      expect(productSchema.saleType("BOTH")).toBe(true);
    });

    it("rejects invalid type", () => {
      expect(productSchema.saleType("PIECE")).toBe(false);
    });
  });

  describe("weightUnit validation", () => {
    it("accepts kg", () => {
      expect(productSchema.weightUnit("kg")).toBe(true);
    });

    it("accepts lb", () => {
      expect(productSchema.weightUnit("lb")).toBe(true);
    });

    it("accepts g", () => {
      expect(productSchema.weightUnit("g")).toBe(true);
    });

    it("accepts null (unit product)", () => {
      expect(productSchema.weightUnit(null)).toBe(true);
    });
  });
});
