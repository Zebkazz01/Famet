import { describe, it, expect, vi } from "vitest";

// Mock dependencies before imports
vi.mock("../../config/env", () => ({
  env: {
    JWT_SECRET: "test-secret-for-testing-12345",
    DATABASE_URL: "postgresql://test:test@localhost:5432/test",
    PORT: 3001,
    SCALE_PORT: "COM3",
    SCALE_BAUD_RATE: 9600,
    BUSINESS_NAME: "Test",
    BUSINESS_ADDRESS: "",
    BUSINESS_PHONE: "",
    JWT_EXPIRES_IN: "8h",
  },
}));

vi.mock("../../config/database", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

describe("Auth Controller logic", () => {
  const JWT_SECRET = "test-secret-for-testing-12345";

  describe("JWT token generation", () => {
    it("creates token with correct payload", () => {
      const payload = { userId: 1, role: "ADMIN" };
      const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "8h" });
      const decoded = jwt.verify(token, JWT_SECRET) as any;

      expect(decoded.userId).toBe(1);
      expect(decoded.role).toBe("ADMIN");
    });

    it("creates token with VENDEDOR role", () => {
      const token = jwt.sign({ userId: 2, role: "VENDEDOR" }, JWT_SECRET, { expiresIn: "8h" });
      const decoded = jwt.verify(token, JWT_SECRET) as any;

      expect(decoded.role).toBe("VENDEDOR");
    });

    it("creates token with SUPERVISOR role", () => {
      const token = jwt.sign({ userId: 3, role: "SUPERVISOR" }, JWT_SECRET, { expiresIn: "8h" });
      const decoded = jwt.verify(token, JWT_SECRET) as any;

      expect(decoded.role).toBe("SUPERVISOR");
    });

    it("rejects expired tokens", () => {
      const token = jwt.sign({ userId: 1, role: "ADMIN" }, JWT_SECRET, { expiresIn: "-1s" });
      expect(() => jwt.verify(token, JWT_SECRET)).toThrow();
    });

    it("rejects tokens with wrong secret", () => {
      const token = jwt.sign({ userId: 1, role: "ADMIN" }, "wrong-secret");
      expect(() => jwt.verify(token, JWT_SECRET)).toThrow();
    });
  });

  describe("Password hashing", () => {
    it("hashes password with bcrypt", async () => {
      const password = "admin123";
      const hash = await bcrypt.hash(password, 10);

      expect(hash).not.toBe(password);
      expect(hash).toMatch(/^\$2[aby]?\$/);
    });

    it("verifies correct password", async () => {
      const password = "admin123";
      const hash = await bcrypt.hash(password, 10);

      expect(await bcrypt.compare(password, hash)).toBe(true);
    });

    it("rejects wrong password", async () => {
      const hash = await bcrypt.hash("admin123", 10);

      expect(await bcrypt.compare("wrongpassword", hash)).toBe(false);
    });

    it("different hashes for same password (salt)", async () => {
      const hash1 = await bcrypt.hash("admin123", 10);
      const hash2 = await bcrypt.hash("admin123", 10);

      expect(hash1).not.toBe(hash2);
      expect(await bcrypt.compare("admin123", hash1)).toBe(true);
      expect(await bcrypt.compare("admin123", hash2)).toBe(true);
    });
  });
});
