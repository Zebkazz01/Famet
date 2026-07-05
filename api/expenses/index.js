const EXPENSES = [
  { id: 1, amount: '50000.00', description: 'Servicios públicos', category: 'Servicios', date: '2026-06-01T00:00:00.000Z', paymentMethod: 'CASH' },
  { id: 2, amount: '25000.00', description: 'Papelería', category: 'Suministros', date: '2026-06-01T00:00:00.000Z', paymentMethod: 'CARD' }
];

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  return res.status(200).json(EXPENSES);
}
