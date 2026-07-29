import { describe, it, expect } from 'vitest';
import { evaluate, type CartItem } from '../discountEngine';
import { DiscountType, type ProductDiscountRule } from '@prisma/client';

function makeRule(overrides: Partial<ProductDiscountRule> & { productId: number }): ProductDiscountRule {
  return {
    id: 1,
    type: DiscountType.PERCENTAGE,
    config: {},
    priority: 1,
    active: true,
    validFrom: null,
    validTo: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as ProductDiscountRule;
}

describe('discountEngine.evaluate', () => {
  describe('no rules', () => {
    it('returns items with zero discount when no rules exist', () => {
      const items: CartItem[] = [
        { productId: 1, quantity: 3, unitPrice: 10 },
      ];
      const result = evaluate(items, []);

      expect(result.totalDiscount).toBe(0);
      expect(result.totalGross).toBe(30);
      expect(result.totalNet).toBe(30);
      expect(result.items[0].discountAmount).toBe(0);
    });
  });

  describe('QUANTITY_THRESHOLD', () => {
    it('applies discount when quantity meets threshold', () => {
      const items: CartItem[] = [
        { productId: 1, quantity: 10, unitPrice: 5 },
      ];
      const rules = [
        makeRule({
          productId: 1,
          type: DiscountType.QUANTITY_THRESHOLD,
          config: { minQty: 5, discountPct: 10 },
        }),
      ];

      const result = evaluate(items, rules);

      expect(result.items[0].discountAmount).toBe(5); // 50 * 10% = 5
      expect(result.totalDiscount).toBe(5);
      expect(result.totalNet).toBe(45);
    });

    it('does NOT apply discount when quantity is below threshold', () => {
      const items: CartItem[] = [
        { productId: 1, quantity: 3, unitPrice: 5 },
      ];
      const rules = [
        makeRule({
          productId: 1,
          type: DiscountType.QUANTITY_THRESHOLD,
          config: { minQty: 5, discountPct: 10 },
        }),
      ];

      const result = evaluate(items, rules);

      expect(result.items[0].discountAmount).toBe(0);
      expect(result.totalNet).toBe(15);
    });
  });

  describe('PERCENTAGE', () => {
    it('applies percentage discount regardless of quantity', () => {
      const items: CartItem[] = [
        { productId: 1, quantity: 2, unitPrice: 20 },
      ];
      const rules = [
        makeRule({
          productId: 1,
          type: DiscountType.PERCENTAGE,
          config: { pct: 15 },
        }),
      ];

      const result = evaluate(items, rules);

      expect(result.items[0].discountAmount).toBe(6); // 40 * 15% = 6
      expect(result.totalNet).toBe(34);
    });
  });

  describe('BUY_X_GET_Y', () => {
    it('applies buy 2 get 1 free', () => {
      const items: CartItem[] = [
        { productId: 1, quantity: 6, unitPrice: 10 },
      ];
      const rules = [
        makeRule({
          productId: 1,
          type: DiscountType.BUY_X_GET_Y,
          config: { buy: 2, get: 1, freePct: 100 },
        }),
      ];

      const result = evaluate(items, rules);

      // 6 items, cycle = 3, 2 cycles, freeUnits = 2, discount = 2 * 10 = 20
      expect(result.items[0].discountAmount).toBe(20);
      expect(result.totalNet).toBe(40);
    });

    it('applies partial free (50% off the free item)', () => {
      const items: CartItem[] = [
        { productId: 1, quantity: 6, unitPrice: 10 },
      ];
      const rules = [
        makeRule({
          productId: 1,
          type: DiscountType.BUY_X_GET_Y,
          config: { buy: 2, get: 1, freePct: 50 },
        }),
      ];

      const result = evaluate(items, rules);

      // 2 free units * 10 * 50% = 10
      expect(result.items[0].discountAmount).toBe(10);
    });
  });

  describe('FIXED_AMOUNT', () => {
    it('applies fixed amount per line', () => {
      const items: CartItem[] = [
        { productId: 1, quantity: 3, unitPrice: 10 },
      ];
      const rules = [
        makeRule({
          productId: 1,
          type: DiscountType.FIXED_AMOUNT,
          config: { amount: 5, perLine: true },
        }),
      ];

      const result = evaluate(items, rules);

      expect(result.items[0].discountAmount).toBe(5);
      expect(result.totalNet).toBe(25);
    });

    it('does not exceed subtotal with fixed amount', () => {
      const items: CartItem[] = [
        { productId: 1, quantity: 1, unitPrice: 3 },
      ];
      const rules = [
        makeRule({
          productId: 1,
          type: DiscountType.FIXED_AMOUNT,
          config: { amount: 5, perLine: true },
        }),
      ];

      const result = evaluate(items, rules);

      // min(5, 3) = 3
      expect(result.items[0].discountAmount).toBe(3);
      expect(result.totalNet).toBe(0);
    });

    it('applies fixed amount per unit', () => {
      const items: CartItem[] = [
        { productId: 1, quantity: 4, unitPrice: 10 },
      ];
      const rules = [
        makeRule({
          productId: 1,
          type: DiscountType.FIXED_AMOUNT,
          config: { amount: 2, perLine: false },
        }),
      ];

      const result = evaluate(items, rules);

      // 2 * 4 = 8, but capped at gross (40)
      expect(result.items[0].discountAmount).toBe(8);
      expect(result.totalNet).toBe(32);
    });
  });

  describe('priority selection', () => {
    it('picks rule with highest priority', () => {
      const items: CartItem[] = [
        { productId: 1, quantity: 5, unitPrice: 10 },
      ];
      const rules = [
        makeRule({
          id: 1,
          productId: 1,
          type: DiscountType.PERCENTAGE,
          config: { pct: 10 },
          priority: 1,
        }),
        makeRule({
          id: 2,
          productId: 1,
          type: DiscountType.PERCENTAGE,
          config: { pct: 25 },
          priority: 3,
        }),
      ];

      const result = evaluate(items, rules);

      // Priority 3 wins: 50 * 25% = 12.5
      expect(result.items[0].discountRuleId).toBe(2);
      expect(result.items[0].discountAmount).toBe(12.5);
    });

    it('picks larger discount among same priority', () => {
      const items: CartItem[] = [
        { productId: 1, quantity: 5, unitPrice: 10 },
      ];
      const rules = [
        makeRule({
          id: 1,
          productId: 1,
          type: DiscountType.PERCENTAGE,
          config: { pct: 10 },
          priority: 2,
        }),
        makeRule({
          id: 2,
          productId: 1,
          type: DiscountType.PERCENTAGE,
          config: { pct: 20 },
          priority: 2,
        }),
      ];

      const result = evaluate(items, rules);

      expect(result.items[0].discountRuleId).toBe(2);
      expect(result.items[0].discountAmount).toBe(10);
    });
  });

  describe('inactive and expired rules', () => {
    it('ignores inactive rules', () => {
      const items: CartItem[] = [
        { productId: 1, quantity: 5, unitPrice: 10 },
      ];
      const rules = [
        makeRule({
          productId: 1,
          type: DiscountType.PERCENTAGE,
          config: { pct: 50 },
          active: false,
        }),
      ];

      const result = evaluate(items, rules);

      expect(result.totalDiscount).toBe(0);
    });

    it('ignores rules not yet valid', () => {
      const items: CartItem[] = [
        { productId: 1, quantity: 5, unitPrice: 10 },
      ];
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);

      const rules = [
        makeRule({
          productId: 1,
          type: DiscountType.PERCENTAGE,
          config: { pct: 50 },
          validFrom: futureDate,
        }),
      ];

      const result = evaluate(items, rules);

      expect(result.totalDiscount).toBe(0);
    });

    it('ignores expired rules', () => {
      const items: CartItem[] = [
        { productId: 1, quantity: 5, unitPrice: 10 },
      ];
      const pastDate = new Date('2020-01-01');

      const rules = [
        makeRule({
          productId: 1,
          type: DiscountType.PERCENTAGE,
          config: { pct: 50 },
          validTo: pastDate,
        }),
      ];

      const result = evaluate(items, rules);

      expect(result.totalDiscount).toBe(0);
    });
  });

  describe('multiple products', () => {
    it('applies rules only to matching products', () => {
      const items: CartItem[] = [
        { productId: 1, quantity: 5, unitPrice: 10 },
        { productId: 2, quantity: 3, unitPrice: 20 },
      ];
      const rules = [
        makeRule({
          productId: 1,
          type: DiscountType.PERCENTAGE,
          config: { pct: 20 },
        }),
      ];

      const result = evaluate(items, rules);

      expect(result.items[0].discountAmount).toBe(10); // 50 * 20%
      expect(result.items[1].discountAmount).toBe(0);  // no rule for product 2
      expect(result.totalDiscount).toBe(10);
      expect(result.totalGross).toBe(110);
      expect(result.totalNet).toBe(100);
    });
  });

  describe('totals consistency', () => {
    it('totalNet equals totalGross minus totalDiscount', () => {
      const items: CartItem[] = [
        { productId: 1, quantity: 10, unitPrice: 15 },
        { productId: 2, quantity: 3, unitPrice: 25 },
      ];
      const rules = [
        makeRule({
          productId: 1,
          type: DiscountType.QUANTITY_THRESHOLD,
          config: { minQty: 5, discountPct: 10 },
        }),
        makeRule({
          productId: 2,
          type: DiscountType.PERCENTAGE,
          config: { pct: 5 },
        }),
      ];

      const result = evaluate(items, rules);

      expect(result.totalNet).toBe(result.totalGross - result.totalDiscount);
      expect(result.items[0].discountedSubtotal).toBe(
        result.items[0].subtotal - result.items[0].discountAmount
      );
      expect(result.items[1].discountedSubtotal).toBe(
        result.items[1].subtotal - result.items[1].discountAmount
      );
    });
  });
});
