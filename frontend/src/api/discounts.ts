import client from './client';

export type DiscountType = 'QUANTITY_THRESHOLD' | 'PERCENTAGE' | 'BUY_X_GET_Y' | 'FIXED_AMOUNT';

export interface DiscountRule {
  id: number;
  productId: number;
  type: DiscountType;
  config: Record<string, any>;
  active: boolean;
  validFrom: string | null;
  validTo: string | null;
  priority: number;
  createdAt: string;
  updatedAt: string;
  product?: { id: number; name: string; price: string };
}

export async function listForProduct(productId: number): Promise<DiscountRule[]> {
  const res = await client.get(`/products/${productId}/discount-rules`);
  return res.data;
}

export async function listAll(): Promise<DiscountRule[]> {
  const res = await client.get('/discount-rules');
  return res.data;
}

export async function create(data: {
  productId: number;
  type: DiscountType;
  config: Record<string, any>;
  active?: boolean;
  priority?: number;
  validFrom?: string | null;
  validTo?: string | null;
}): Promise<DiscountRule> {
  const res = await client.post('/discount-rules', data);
  return res.data;
}

export async function update(id: number, data: Partial<{
  type: DiscountType;
  config: Record<string, any>;
  active: boolean;
  priority: number;
  validFrom: string | null;
  validTo: string | null;
}>): Promise<DiscountRule> {
  const res = await client.put(`/discount-rules/${id}`, data);
  return res.data;
}

export async function remove(id: number): Promise<void> {
  await client.delete(`/discount-rules/${id}`);
}

export interface PreviewResult {
  items: Array<{
    productId: number;
    quantity: number;
    unitPrice: number;
    finalUnitPrice: number;
    subtotal: number;
    discountAmount: number;
    discountedSubtotal: number;
    discountRuleId: number | null;
  }>;
  totalDiscount: number;
  totalGross: number;
  totalNet: number;
}

export async function preview(items: Array<{
  productId: number;
  quantity: number;
  unitPrice: number;
}>): Promise<PreviewResult> {
  const res = await client.post('/discount-rules/preview', { items });
  return res.data;
}

export const DISCOUNT_TYPE_LABELS: Record<DiscountType, string> = {
  QUANTITY_THRESHOLD: 'Descuento por cantidad',
  PERCENTAGE: 'Porcentaje',
  BUY_X_GET_Y: 'Lleva X paga Y',
  FIXED_AMOUNT: 'Monto fijo',
};

export const DISCOUNT_TYPE_DESCRIPTIONS: Record<DiscountType, string> = {
  QUANTITY_THRESHOLD: 'Si compra al menos N uds, descuenta % sobre el total',
  PERCENTAGE: 'Aplica un % siempre que el producto se venda',
  BUY_X_GET_Y: 'Por cada compra de X uds, regala Y uds gratis',
  FIXED_AMOUNT: 'Descuenta un monto fijo por unidad (o por línea)',
};
