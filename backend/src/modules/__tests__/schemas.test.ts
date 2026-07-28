import { describe, it, expect } from 'vitest';
import { createSaleSchema, correctSaleSchema } from '../sales/sales.schema';
import { loginSchema } from '../auth/auth.schema';

describe('createSaleSchema', () => {
  const validSale = {
    items: [
      { productId: 1, quantity: 2, unitPrice: 10.5 },
    ],
    paymentMethod: 'CASH',
    amountPaid: 21,
  };

  it('accepts a valid cash sale', () => {
    const result = createSaleSchema.safeParse(validSale);
    expect(result.success).toBe(true);
  });

  it('accepts CARD payment', () => {
    const result = createSaleSchema.safeParse({ ...validSale, paymentMethod: 'CARD' });
    expect(result.success).toBe(true);
  });

  it('accepts TRANSFER payment', () => {
    const result = createSaleSchema.safeParse({ ...validSale, paymentMethod: 'TRANSFER' });
    expect(result.success).toBe(true);
  });

  it('rejects invalid payment method', () => {
    const result = createSaleSchema.safeParse({ ...validSale, paymentMethod: 'BITCOIN' });
    expect(result.success).toBe(false);
  });

  it('rejects empty items array', () => {
    const result = createSaleSchema.safeParse({ ...validSale, items: [] });
    expect(result.success).toBe(false);
  });

  it('rejects item with zero quantity', () => {
    const result = createSaleSchema.safeParse({
      ...validSale,
      items: [{ productId: 1, quantity: 0, unitPrice: 10 }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects item with negative unitPrice', () => {
    const result = createSaleSchema.safeParse({
      ...validSale,
      items: [{ productId: 1, quantity: 1, unitPrice: -5 }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects item with non-integer productId', () => {
    const result = createSaleSchema.safeParse({
      ...validSale,
      items: [{ productId: 1.5, quantity: 1, unitPrice: 10 }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects negative amountPaid', () => {
    const result = createSaleSchema.safeParse({ ...validSale, amountPaid: -1 });
    expect(result.success).toBe(false);
  });

  it('accepts credit sale with customerId', () => {
    const result = createSaleSchema.safeParse({
      ...validSale,
      isCredit: true,
      customerId: 1,
      dueDate: '2026-08-01',
    });
    expect(result.success).toBe(true);
  });

  it('applies defaults correctly', () => {
    const result = createSaleSchema.parse(validSale);
    expect(result.items[0].isSubUnit).toBe(false);
    expect(result.items[0].skipDiscount).toBeUndefined();
    expect(result.paymentStatus).toBe('CONFIRMED');
    expect(result.isCredit).toBe(false);
  });
});

describe('correctSaleSchema', () => {
  it('accepts a correction with reason', () => {
    const result = correctSaleSchema.safeParse({ correctionReason: 'Cliente devolvió producto' });
    expect(result.success).toBe(true);
  });

  it('rejects empty correction reason', () => {
    const result = correctSaleSchema.safeParse({ correctionReason: '' });
    expect(result.success).toBe(false);
  });
});

describe('loginSchema', () => {
  it('accepts valid credentials', () => {
    const result = loginSchema.safeParse({ username: 'admin', password: 'admin123' });
    expect(result.success).toBe(true);
  });

  it('rejects empty username', () => {
    const result = loginSchema.safeParse({ username: '', password: 'admin123' });
    expect(result.success).toBe(false);
  });

  it('rejects empty password', () => {
    const result = loginSchema.safeParse({ username: 'admin', password: '' });
    expect(result.success).toBe(false);
  });

  it('rejects missing fields', () => {
    const result = loginSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});
