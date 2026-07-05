export function getStockStatus(stock: number, saleType: string) {
  if (saleType === 'WEIGHT') return null;
  if (stock <= 0) return { text: 'Agotado', color: 'bg-red-500 text-white' };
  if (stock <= 5) return { text: `Por agotarse (${stock})`, color: 'bg-orange-500 text-white' };
  if (stock <= 10) return { text: `Pocas unidades (${stock})`, color: 'bg-yellow-500 text-white' };
  return null;
}

export function StockBadge({ stock, saleType }: { stock: number; saleType: string }) {
  const status = getStockStatus(stock, saleType);
  if (!status) return null;
  return <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${status.color}`}>{status.text}</span>;
}
