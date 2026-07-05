// Mock categories data
const CATEGORIES = [
  { id: 1, name: 'Lácteos', color: '#10B981', active: true, description: 'Productos lácteos y huevos', cookingMethods: [], animalType: null, animalPart: null, parentId: null, _count: { products: 1 } },
  { id: 2, name: 'Carnes', color: '#EF4444', active: true, description: 'Carnes frescas', cookingMethods: ['Asado', 'Frito', 'Hervido', 'Plancha'], animalType: null, animalPart: null, parentId: null, _count: { products: 3 } },
  { id: 3, name: 'Bebidas', color: '#3B82F6', active: true, description: 'Bebidas y cervezas', cookingMethods: [], animalType: null, animalPart: null, parentId: null, _count: { products: 2 } },
  { id: 4, name: 'Embutidos', color: '#F59E0B', active: true, description: 'Chorizos y embutidos', cookingMethods: ['Asado', 'Frito'], animalType: 'CERDO', animalPart: null, parentId: null, _count: { products: 1 } },
  { id: 5, name: 'Mariscos', color: '#06B6D4', active: true, description: 'Pescados y mariscos', cookingMethods: ['Salteado', 'Frito', 'Hervido'], animalType: 'PESCADO', animalPart: null, parentId: null, _count: { products: 1 } },
  { id: 6, name: 'Varios', color: '#8B5CF6', active: true, description: 'Productos varios', cookingMethods: [], animalType: null, animalPart: null, parentId: null, _count: { products: 0 } }
];

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') return res.status(200).end();
  
  return res.status(200).json({ data: CATEGORIES.filter(c => c.active) });
}
