export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  return res.status(200).json([
    { id: 1, firstName: 'Admin', lastName: 'Sistema', role: 'ADMIN' },
    { id: 2, firstName: 'María', lastName: 'García', role: 'SUPERVISOR' },
    { id: 3, firstName: 'Carlos', lastName: 'López', role: 'VENDEDOR' }
  ]);
}
