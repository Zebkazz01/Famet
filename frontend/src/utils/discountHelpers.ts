export interface DiscountRuleLite {
  id: number;
  type: string;
  config: any;
  priority?: number;
}

export function getPromoLabel(rule: DiscountRuleLite): string {
  const cfg = rule.config || {};
  switch (rule.type) {
    case 'QUANTITY_THRESHOLD':
      return `${cfg.minQty}+ uds → ${cfg.discountPct}% off`;
    case 'PERCENTAGE':
      return `${cfg.pct}% off`;
    case 'BUY_X_GET_Y':
      return `${cfg.buy}x${cfg.buy + cfg.get}`;
    case 'FIXED_AMOUNT':
      return `$${cfg.amount} off${cfg.perLine ? '/línea' : ''}`;
    default:
      return 'Promo';
  }
}

/** Devuelve label del mejor descuento (mayor prioridad). null si no hay. */
export function getBestPromoLabel(rules?: DiscountRuleLite[] | null): string | null {
  if (!rules || rules.length === 0) return null;
  const sorted = [...rules].sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
  return getPromoLabel(sorted[0]);
}
