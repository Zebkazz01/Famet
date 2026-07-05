import { Decimal } from "@prisma/client/runtime/library";
import { ProductDiscountRule, DiscountType } from "@prisma/client";

export interface CartItem {
  productId: number;
  quantity: number;
  unitPrice: number;
}

export interface DiscountedItem {
  productId: number;
  quantity: number;
  unitPrice: number; // precio original
  finalUnitPrice: number; // precio efectivo después de descuento
  subtotal: number; // bruto sin descuento
  discountAmount: number; // descuento aplicado a la línea
  discountedSubtotal: number; // subtotal - discountAmount
  discountRuleId: number | null;
}

export interface EvaluateResult {
  items: DiscountedItem[];
  totalDiscount: number;
  totalGross: number;
  totalNet: number;
}

interface QtyConfig { minQty: number; discountPct: number; }
interface PctConfig { pct: number; }
interface BuyXGetYConfig { buy: number; get: number; freePct?: number; }
interface FixedConfig { amount: number; perLine?: boolean; }

function isActiveNow(rule: ProductDiscountRule, when: Date): boolean {
  if (!rule.active) return false;
  if (rule.validFrom && rule.validFrom > when) return false;
  if (rule.validTo && rule.validTo < when) return false;
  return true;
}

/**
 * Calcula descuento por línea según regla. Devuelve monto total descontado.
 */
function applyRule(item: CartItem, rule: ProductDiscountRule): number {
  const cfg = rule.config as any;
  switch (rule.type as DiscountType) {
    case "QUANTITY_THRESHOLD": {
      const c = cfg as QtyConfig;
      if (item.quantity >= c.minQty) {
        return (item.unitPrice * item.quantity) * (c.discountPct / 100);
      }
      return 0;
    }
    case "PERCENTAGE": {
      const c = cfg as PctConfig;
      return (item.unitPrice * item.quantity) * (c.pct / 100);
    }
    case "BUY_X_GET_Y": {
      const c = cfg as BuyXGetYConfig;
      const cycle = c.buy + c.get;
      const cycles = Math.floor(item.quantity / cycle);
      const freeUnits = cycles * c.get;
      const freePct = (c.freePct ?? 100) / 100;
      return freeUnits * item.unitPrice * freePct;
    }
    case "FIXED_AMOUNT": {
      const c = cfg as FixedConfig;
      if (c.perLine) return Math.min(c.amount, item.unitPrice * item.quantity);
      const total = c.amount * item.quantity;
      return Math.min(total, item.unitPrice * item.quantity);
    }
    default:
      return 0;
  }
}

/**
 * Evalúa los items contra reglas (todas las reglas, agrupadas por productId).
 * Selecciona la regla con mayor priority por producto. Si empate, mayor descuento.
 */
export function evaluate(
  items: CartItem[],
  rules: ProductDiscountRule[],
  when: Date = new Date(),
): EvaluateResult {
  const rulesByProduct = new Map<number, ProductDiscountRule[]>();
  for (const r of rules) {
    if (!isActiveNow(r, when)) continue;
    const arr = rulesByProduct.get(r.productId) || [];
    arr.push(r);
    rulesByProduct.set(r.productId, arr);
  }

  const result: DiscountedItem[] = [];
  let totalDiscount = 0;
  let totalGross = 0;

  for (const item of items) {
    const gross = item.unitPrice * item.quantity;
    totalGross += gross;
    const productRules = rulesByProduct.get(item.productId) || [];
    let bestDiscount = 0;
    let bestRuleId: number | null = null;
    if (productRules.length > 0) {
      // Sort by priority DESC, evaluar todas para escoger la que más descuento da entre las de mayor priority
      const maxPriority = Math.max(...productRules.map((r) => r.priority));
      const candidates = productRules.filter((r) => r.priority === maxPriority);
      for (const rule of candidates) {
        const d = applyRule(item, rule);
        if (d > bestDiscount) {
          bestDiscount = d;
          bestRuleId = rule.id;
        }
      }
    }
    const finalUnitPrice = item.quantity > 0
      ? Math.max(0, (gross - bestDiscount) / item.quantity)
      : item.unitPrice;
    result.push({
      productId: item.productId,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      finalUnitPrice,
      subtotal: gross,
      discountAmount: bestDiscount,
      discountedSubtotal: gross - bestDiscount,
      discountRuleId: bestRuleId,
    });
    totalDiscount += bestDiscount;
  }

  return {
    items: result,
    totalDiscount,
    totalGross,
    totalNet: totalGross - totalDiscount,
  };
}

/** Versión Decimal para uso en sales.controller dentro de transacciones. */
export function evaluateDecimal(
  items: CartItem[],
  rules: ProductDiscountRule[],
  when: Date = new Date(),
): { items: Array<DiscountedItem & { discountDecimal: Decimal }>; totalDiscount: Decimal } {
  const r = evaluate(items, rules, when);
  return {
    items: r.items.map((i) => ({ ...i, discountDecimal: new Decimal(i.discountAmount) })),
    totalDiscount: new Decimal(r.totalDiscount),
  };
}
