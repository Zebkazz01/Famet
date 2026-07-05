// Mock recent sales data
const SALES = [
  {
    id: 1001,
    userId: 3,
    user: { id: 3, firstName: 'Carlos', lastName: 'López' },
    subtotal: 27500,
    total: 27500,
    discountTotal: 0,
    paymentMethod: 'CASH',
    amountPaid: 30000,
    changeAmount: 2500,
    isCredit: false,
    customerId: null,
    customer: null,
    creditBalance: 0,
    corrected: false,
    createdAt: '2026-06-01T14:30:00.000Z',
    items: [
      { id: 1, productId: 1, product: { name: 'Huevos AA' }, quantity: 1, unitPrice: 15000, subtotal: 15000 },
      { id: 2, productId: 2, product: { name: 'Muslo de Pollo' }, quantity: 1.31, unitPrice: 9500, subtotal: 12500 }
    ]
  },
  {
    id: 1002,
    userId: 3,
    user: { id: 3, firstName: 'Carlos', lastName: 'López' },
    subtotal: 12000,
    total: 12000,
    discountTotal: 0,
    paymentMethod: 'CARD',
    amountPaid: 12000,
    changeAmount: 0,
    isCredit: false,
    customerId: null,
    customer: null,
    creditBalance: 0,
    corrected: false,
    createdAt: '2026-06-01T13:15:00.000Z',
    items: [
      { id: 3, productId: 3, product: { name: 'Pechuga de Pollo' }, quantity: 1, unitPrice: 12000, subtotal: 12000 }
    ]
  },
  {
    id: 1003,
    userId: 2,
    user: { id: 2, firstName: 'María', lastName: 'García' },
    subtotal: 45500,
    total: 45500,
    discountTotal: 0,
    paymentMethod: 'CASH',
    amountPaid: 50000,
    changeAmount: 4500,
    isCredit: false,
    customerId: null,
    customer: null,
    creditBalance: 0,
    corrected: false,
    createdAt: '2026-06-01T11:45:00.000Z',
    items: [
      { id: 4, productId: 4, product: { name: 'Lomo de Res' }, quantity: 1, unitPrice: 28000, subtotal: 28000 },
      { id: 5, productId: 5, product: { name: 'Cerveza Águila' }, quantity: 5, unitPrice: 3500, subtotal: 17500 }
    ]
  },
  {
    id: 1004,
    userId: 3,
    user: { id: 3, firstName: 'Carlos', lastName: 'López' },
    subtotal: 8500,
    total: 8500,
    discountTotal: 0,
    paymentMethod: 'TRANSFER',
    amountPaid: 8500,
    changeAmount: 0,
    isCredit: false,
    customerId: 1,
    customer: { id: 1, name: 'Juan Pérez' },
    creditBalance: 0,
    corrected: false,
    createdAt: '2026-06-01T10:20:00.000Z',
    items: [
      { id: 6, productId: 5, product: { name: 'Cerveza Águila' }, quantity: 1, unitPrice: 3500, subtotal: 3500 },
      { id: 7, productId: 8, product: { name: 'Gaseosa Coca-Cola 1.5L' }, quantity: 1, unitPrice: 5500, subtotal: 5500 }
    ]
  }
];

module.exports = function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Return last 10 sales
  const recentSales = SALES.slice(0, 10);

  return res.status(200).json({ data: recentSales });
};
