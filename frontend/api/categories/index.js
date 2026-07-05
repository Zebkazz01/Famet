// Mock categories data
const CATEGORIES = [
  {
    id: 1,
    name: 'Lácteos',
    color: '#10B981',
    active: true,
    description: 'Productos lácteos y huevos',
    cookingMethods: [],
    animalType: null,
    animalPart: null,
    parentId: null,
    createdAt: '2026-01-15T10:00:00.000Z',
    updatedAt: '2026-01-15T10:00:00.000Z',
    _count: { products: 1 }
  },
  {
    id: 2,
    name: 'Carnes',
    color: '#EF4444',
    active: true,
    description: 'Carnes frescas de res, cerdo y pollo',
    cookingMethods: ['Asado', 'Frito', 'Hervido', 'Plancha', 'Salteado'],
    animalType: null,
    animalPart: null,
    parentId: null,
    createdAt: '2026-01-15T10:00:00.000Z',
    updatedAt: '2026-01-15T10:00:00.000Z',
    _count: { products: 3 }
  },
  {
    id: 3,
    name: 'Bebidas',
    color: '#3B82F6',
    active: true,
    description: 'Bebidas gaseosas, jugos y cervezas',
    cookingMethods: [],
    animalType: null,
    animalPart: null,
    parentId: null,
    createdAt: '2026-01-15T10:00:00.000Z',
    updatedAt: '2026-01-15T10:00:00.000Z',
    _count: { products: 2 }
  },
  {
    id: 4,
    name: 'Embutidos',
    color: '#F59E0B',
    active: true,
    description: 'Chorizos, morcillas y embutidos artesanales',
    cookingMethods: ['Asado', 'Frito'],
    animalType: 'CERDO',
    animalPart: null,
    parentId: null,
    createdAt: '2026-01-15T10:00:00.000Z',
    updatedAt: '2026-01-15T10:00:00.000Z',
    _count: { products: 1 }
  },
  {
    id: 5,
    name: 'Mariscos',
    color: '#06B6D4',
    active: true,
    description: 'Pescados y mariscos frescos',
    cookingMethods: ['Salteado', 'Frito', 'Hervido', 'Al horno'],
    animalType: 'PESCADO',
    animalPart: null,
    parentId: null,
    createdAt: '2026-01-15T10:00:00.000Z',
    updatedAt: '2026-01-15T10:00:00.000Z',
    _count: { products: 1 }
  },
  {
    id: 6,
    name: 'Varios',
    color: '#8B5CF6',
    active: true,
    description: 'Productos varios y abarrotes',
    cookingMethods: [],
    animalType: null,
    animalPart: null,
    parentId: null,
    createdAt: '2026-01-15T10:00:00.000Z',
    updatedAt: '2026-01-15T10:00:00.000Z',
    _count: { products: 0 }
  }
];

module.exports = function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const activeCategories = CATEGORIES.filter(c => c.active);

  return res.status(200).json({ data: activeCategories });
};
