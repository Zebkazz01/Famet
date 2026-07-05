const SUPPLIERS = [
  { id: 1, name: 'Distribuidora Central', nit: '900123456', phone: '3101112233', email: 'ventas@distcentral.com', active: true },
  { id: 2, name: 'Avícola del Norte', nit: '900789012', phone: '3154445566', contact: 'pedidos@avinorte.com', active: true }
];

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  return res.status(200).json(SUPPLIERS);
}
