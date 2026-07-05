const SALES = [
  { id: 1001, total: 27500, paymentMethod: 'CASH', createdAt: '2026-06-01T14:30:00.000Z', user: { firstName: 'Carlos', lastName: 'López' }, items: [{ product: { name: 'Huevos AA' }, quantity: 1, subtotal: 15000 }, { product: { name: 'Muslo de Pollo' }, quantity: 1.31, subtotal: 12500 }] },
  { id: 1002, total: 12000, paymentMethod: 'CARD', createdAt: '2026-06-01T13:15:00.000Z', user: { firstName: 'Carlos', lastName: 'López' }, items: [{ product: { name: 'Pechuga de Pollo' }, quantity: 1, subtotal: 12000 }] },
  { id: 1003, total: 45500, paymentMethod: 'CASH', createdAt: '2026-06-01T11:45:00.000Z', user: { firstName: 'María', lastName: 'García' }, items: [{ product: { name: 'Lomo de Res' }, quantity: 1, subtotal: 28000 }, { product: { name: 'Cerveza Águila' }, quantity: 5, subtotal: 17500 }] },
  { id: 1004, total: 8500, paymentMethod: 'TRANSFER', createdAt: '2026-06-01T10:20:00.000Z', user: { firstName: 'Carlos', lastName: 'López' }, items: [{ product: { name: 'Cerveza Águila' }, quantity: 1, subtotal: 3500 }, { product: { name: 'Gaseosa Coca-Cola 1.5L' }, quantity: 1, subtotal: 5500 }] }
];

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  return res.status(200).json({ data: SALES });
}
