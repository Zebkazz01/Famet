const CATEGORIES = [
  { id: 1, name: 'Lácteos', color: '#10B981', active: true },
  { id: 2, name: 'Carnes', color: '#EF4444', active: true },
  { id: 3, name: 'Bebidas', color: '#3B82F6', active: true },
  { id: 4, name: 'Embutidos', color: '#F59E0B', active: true },
  { id: 5, name: 'Mariscos', color: '#06B6D4', active: true },
  { id: 6, name: 'Varios', color: '#8B5CF6', active: true }
];

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  return res.status(200).json(CATEGORIES);
}
