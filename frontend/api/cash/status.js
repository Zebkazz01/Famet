// Mock cash register status
const CASH_STATUS = {
  isOpen: true,
  openingAmount: 200000,
  currentBalance: 247500,
  movements: [
    { id: 1, type: 'CASH_IN', amount: 50000, reason: 'Venta #1001', createdAt: '2026-06-01T14:30:00.000Z' },
    { id: 2, type: 'CASH_IN', amount: 12000, reason: 'Venta #1002', createdAt: '2026-06-01T13:15:00.000Z' },
    { id: 3, type: 'CASH_OUT', amount: -5000, reason: 'Cambio dado', createdAt: '2026-06-01T14:35:00.000Z' }
  ],
  openedBy: { id: 3, firstName: 'Carlos', lastName: 'López' },
  openedAt: '2026-06-01T08:00:00.000Z'
};

module.exports = function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  return res.status(200).json({ data: CASH_STATUS });
};
