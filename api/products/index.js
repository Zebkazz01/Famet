const PRODUCTS = [
  { id: 1, name: 'Huevos AA', price: '15000.00', stockQty: '150.000', saleType: 'BOTH', weightUnit: 'ud', category: { id: 1, name: 'Lácteos', color: '#10B981' }, subUnitPrice: '500.00', subUnitName: 'Huevo', unitsPerPack: 30 },
  { id: 2, name: 'Muslo de Pollo', price: '9500.00', stockQty: '25.500', saleType: 'WEIGHT', weightUnit: 'lb', category: { id: 2, name: 'Carnes', color: '#EF4444' } },
  { id: 3, name: 'Pechuga de Pollo', price: '12000.00', stockQty: '18.300', saleType: 'WEIGHT', weightUnit: 'lb', category: { id: 2, name: 'Carnes', color: '#EF4444' } },
  { id: 4, name: 'Lomo de Res', price: '28000.00', stockQty: '12.800', saleType: 'WEIGHT', weightUnit: 'lb', category: { id: 2, name: 'Carnes', color: '#EF4444' } },
  { id: 5, name: 'Cerveza Águila', price: '3500.00', stockQty: '48.000', saleType: 'UNIT', weightUnit: 'und', category: { id: 3, name: 'Bebidas', color: '#3B82F6' } },
  { id: 6, name: 'Chorizo artesanal', price: '18000.00', stockQty: '8.200', saleType: 'WEIGHT', weightUnit: 'lb', category: { id: 4, name: 'Embutidos', color: '#F59E0B' } },
  { id: 7, name: 'Camarón importado', price: '45000.00', stockQty: '5.500', saleType: 'WEIGHT', weightUnit: 'lb', category: { id: 5, name: 'Mariscos', color: '#06B6D4' } },
  { id: 8, name: 'Gaseosa Coca-Cola 1.5L', price: '5500.00', stockQty: '36.000', saleType: 'UNIT', weightUnit: 'und', category: { id: 3, name: 'Bebidas', color: '#3B82F6' } }
];

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  return res.status(200).json(PRODUCTS);
}
