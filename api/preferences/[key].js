export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  const { key } = req.query;
  if (req.method === 'PUT') {
    return res.status(200).json({ key, value: req.body.value });
  }
  if (req.method === 'DELETE') {
    return res.status(200).json({ ok: true });
  }
  const PREFS = { menu_order: '[]' };
  return res.status(200).json({ key, value: PREFS[key] || null });
}
