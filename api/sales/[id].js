const SALES = {
  1001: { id: 1001, total: '27500.00', paymentMethod: 'CASH', createdAt: '2026-06-01T14:30:00.000Z', user: { firstName: 'Carlos', lastName: 'López' }, items: [{ product: { name: 'Huevos AA' }, quantity: '1.000', subtotal: '15000.00' }, { product: { name: 'Muslo de Pollo' }, quantity: '1.310', subtotal: '12500.00' }] },
  1002: { id: 1002, total: '12000.00', paymentMethod: 'CARD', createdAt: '2026-06-01T13:15:00.000Z', user: { firstName: 'Carlos', lastName: 'López' }, items: [{ product: { name: 'Pechuga de Pollo' }, quantity: '1.000', subtotal: '12000.00' }] },
  1003: { id: 1003, total: '45500.00', paymentMethod: 'CASH', createdAt: '2026-06-01T11:45:00.000Z', user: { firstName: 'María', lastName: 'García' }, items: [{ product: { name: 'Lomo de Res' }, quantity: '1.000', subtotal: '28000.00' }, { product: { name: 'Cerveza Águila' }, quantity: '5.000', subtotal: '17500.00' }] },
  1004: { id: 1004, total: '8500.00', paymentMethod: 'TRANSFER', createdAt: '2026-06-01T10:20:00.000Z', user: { firstName: 'Carlos', lastName: 'López' }, items: [{ product: { name: 'Cerveza Águila' }, quantity: '1.000', subtotal: '3500.00' }, { product: { name: 'Gaseosa Coca-Cola 1.5L' }, quantity: '1.000', subtotal: '5500.00' }] }
};

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  
  const { id } = req.query;
  const sale = SALES[Number(id)];
  if (!sale) return res.status(404).json({ error: 'Sale not found' });
  return res.status(200).json(sale);
}
