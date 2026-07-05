export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  return res.status(200).json({
    data: {
      isOpen: true,
      openingAmount: 200000,
      currentBalance: 247500,
      openedBy: { firstName: 'Carlos', lastName: 'López' },
      openedAt: '2026-06-01T08:00:00.000Z'
    }
  });
}
