const CUSTOMERS = [
  { id: 1, name: 'Juan Pérez', phone: '3101234567', document: '1234567890', currentDebt: '0.00', creditLimit: '500000.00', discountPercent: '5.00', active: true },
  { id: 2, name: 'María García', phone: '3159876543', document: '0987654321', currentDebt: '25000.00', creditLimit: '300000.00', discountPercent: null, active: true }
];

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  return res.status(200).json(CUSTOMERS);
}
