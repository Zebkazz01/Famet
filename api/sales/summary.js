export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  return res.status(200).json({
    totalSales: 93500,
    totalTransactions: 4,
    cashTotal: 73000,
    cardTotal: 12000,
    transferTotal: 8500,
    date: req.query.date || '2026-06-01'
  });
}
