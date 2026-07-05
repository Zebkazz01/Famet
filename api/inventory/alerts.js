// Mock inventory alerts
export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') return res.status(200).end();
  
  return res.status(200).json({
    data: {
      lowStock: [{ id: 6, name: 'Chorizo artesanal', stockQty: 8.2, minStock: 2, category: { name: 'Embutidos' } }],
      expiring: [{ id: 1, name: 'Huevos AA', batches: [{ batchCode: 'LOT-001', expiryDate: '2026-06-15T00:00:00.000Z', qty: 30 }] }],
      totalLowStock: 1,
      totalExpiring: 1
    }
  });
}
