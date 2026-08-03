import { describe, it, expect } from "vitest";
import { createMovementSchema } from "../inventory.schema";

describe("inventory.schema", () => {
  describe("createMovementSchema", () => {
    const valid = {
      productId: 1,
      type: "ENTRY" as const,
      quantity: 10,
    };

    it("accepts valid ENTRY movement", () => {
      expect(createMovementSchema.safeParse(valid).success).toBe(true);
    });

    it("accepts ADJUSTMENT type", () => {
      expect(createMovementSchema.safeParse({ ...valid, type: "ADJUSTMENT" }).success).toBe(true);
    });

    it("accepts LOSS type", () => {
      expect(createMovementSchema.safeParse({ ...valid, type: "LOSS" }).success).toBe(true);
    });

    it("accepts RETURN type", () => {
      expect(createMovementSchema.safeParse({ ...valid, type: "RETURN" }).success).toBe(true);
    });

    it("rejects invalid type", () => {
      expect(createMovementSchema.safeParse({ ...valid, type: "SELL" }).success).toBe(false);
    });

    it("rejects zero quantity", () => {
      expect(createMovementSchema.safeParse({ ...valid, quantity: 0 }).success).toBe(false);
    });

    it("rejects negative quantity", () => {
      expect(createMovementSchema.safeParse({ ...valid, quantity: -5 }).success).toBe(false);
    });

    it("rejects non-integer productId", () => {
      expect(createMovementSchema.safeParse({ ...valid, productId: 1.5 }).success).toBe(false);
    });

    it("accepts optional notes", () => {
      expect(createMovementSchema.safeParse({ ...valid, notes: "Ajuste por inventario" }).success).toBe(true);
    });

    it("applies defaults correctly", () => {
      const result = createMovementSchema.parse(valid);
      expect(result.notes).toBeUndefined();
    });
  });
});
