import client from './client';

export type CookingMethod = 'ASAR' | 'FREIR' | 'SUDAR' | 'SOPA' | 'GUISAR' | 'PLANCHA' | 'CRUDO' | 'AHUMAR' | 'OTRO';

export const COOKING_METHOD_LABELS: Record<CookingMethod, string> = {
  ASAR: 'Asar',
  FREIR: 'Freír',
  SUDAR: 'Sudar',
  SOPA: 'Sopa / Caldo',
  GUISAR: 'Guisar',
  PLANCHA: 'Plancha',
  CRUDO: 'Crudo / Ceviche',
  AHUMAR: 'Ahumar',
  OTRO: 'Otro',
};

export const COOKING_METHODS: CookingMethod[] = ['ASAR', 'FREIR', 'SUDAR', 'SOPA', 'GUISAR', 'PLANCHA', 'CRUDO', 'AHUMAR', 'OTRO'];

export type AnimalType = 'RES' | 'CERDO' | 'POLLO' | 'PESCADO' | 'CORDERO' | 'CABRA' | 'MARISCO' | 'OTRO';

export const ANIMAL_TYPE_LABELS: Record<AnimalType, string> = {
  RES: 'Res',
  CERDO: 'Cerdo',
  POLLO: 'Pollo',
  PESCADO: 'Pescado',
  CORDERO: 'Cordero',
  CABRA: 'Cabra',
  MARISCO: 'Marisco',
  OTRO: 'Otro',
};

export const ANIMAL_TYPES: AnimalType[] = ['RES', 'CERDO', 'POLLO', 'PESCADO', 'CORDERO', 'CABRA', 'MARISCO', 'OTRO'];

/** Cortes y productos cárnicos típicos colombianos (Fedegán, Veleñita, Carnes Lakota, Nestlé Colombia). */
export const ANIMAL_PARTS: Record<AnimalType, string[]> = {
  RES: [
    // Cortes finos
    'Lomo fino', 'Lomo ancho', 'Solomito', 'Punta de anca', 'Punta gorda', 'Chatas',
    'T-bone (lomo bajo)', 'Bistec', 'Churrasco', 'Chocozuela',
    // Cortes para guisar / sudar
    'Posta negra', 'Posta blanca', 'Muchacho', 'Bola de pierna', 'Bola de brazo',
    'Cadera', 'Centro de pierna', 'Nalga de adentro', 'Nalga de afuera',
    // Cortes con hueso
    'Costilla', 'Costilla cargada', 'Costilla de pecho', 'Espinazo', 'Cogote',
    // Sopas y caldos
    'Murillo (osobuco)', 'Lagarto', 'Hueso poroso', 'Hueso blanco', 'Hueso carnudo',
    'Pecho', 'Entrepecho', 'Pajarilla', 'Falda', 'Malaya',
    // Vísceras
    'Sobrebarriga gruesa', 'Sobrebarriga delgada', 'Pajarilla', 'Hígado',
    'Lengua', 'Riñón', 'Corazón', 'Mondongo', 'Pata', 'Rabo',
    // Otros
    'Vacío', 'Paletero', 'Morrillo', 'Sabaleta', 'Bota',
    'Carne molida', 'Carne para asar', 'Carne para guisar', 'Carne para sopa',
  ],
  CERDO: [
    // Cortes principales
    'Lomo', 'Lomo de cinta', 'Pernil (pierna)', 'Brazo (paleta)', 'Espaldilla',
    'Costilla', 'Costilla con tocino', 'Chuleta', 'Chuleta valluna', 'Espinazo',
    'Bondiola (aguja)', 'Cabeza de lomo', 'Solomo',
    // Tocino y panceta
    'Tocino barriguero (panceta)', 'Tocino carnudo', 'Tocino para chicharrón',
    'Tocineta', 'Manteca',
    // Productos preparados
    'Chicharrón', 'Lechona entera', 'Cojín de lechona', 'Lechona pequeña',
    'Costillas BBQ', 'Pernil deshuesado', 'Pernil ahumado',
    // Embutidos comunes
    'Chorizo', 'Chorizo santarrosano', 'Morcilla', 'Longaniza', 'Salchichón',
    'Butifarra', 'Salchicha',
    // Vísceras / extras
    'Cabeza', 'Oreja', 'Patas', 'Cola', 'Rabo', 'Hígado', 'Riñón', 'Corazón',
  ],
  POLLO: [
    // Presas (cortes)
    'Pollo entero', 'Pollo despresado', 'Medio pollo',
    'Pechuga entera', 'Pechuga deshuesada', 'Filete de pechuga', 'Tira de pechuga',
    'Pierna pernil (jamoncillo)', 'Muslo', 'Contramuslo', 'Pierna sin muslo',
    'Alas enteras', 'Alitas BBQ', 'Apastelado',
    'Costillar', 'Rabadilla', 'Espinazo',
    // Menudencias
    'Menudencias', 'Hígado', 'Molleja', 'Corazón', 'Patas', 'Cabeza', 'Pescuezo',
    // Otros
    'Pollo asado', 'Pollo broaster', 'Pechuga apanada', 'Nuggets',
  ],
  PESCADO: [
    // Río Colombia
    'Bocachico', 'Bagre', 'Bagre rayado (pintadillo)', 'Capaz', 'Nicuro',
    'Sabaleta', 'Cachama', 'Yamú', 'Dorada (mueluda)', 'Blanquillo', 'Arenca',
    'Tilapia roja', 'Tilapia plateada (mojarra)', 'Trucha arcoíris',
    // Mar Caribe / Pacífico
    'Pargo rojo', 'Pargo platero', 'Sierra', 'Atún', 'Atún aleta amarilla',
    'Merluza', 'Corvina', 'Róbalo', 'Lebranche', 'Pacora', 'Lisa', 'Jurel',
    'Cherna', 'Salmón', 'Sardina',
    // Cortes
    'Entero', 'Filete', 'Posta', 'Lomo', 'Cola', 'Cabeza', 'Mariposa',
    'Anillos', 'Apanado',
  ],
  CORDERO: [
    'Pierna', 'Costillar', 'Lomo', 'Espaldilla', 'Cuello', 'Chuleta',
    'Falda', 'Pecho', 'Pulpa', 'Hueso para sopa',
  ],
  CABRA: [
    'Pierna', 'Costillar', 'Lomo', 'Espaldilla', 'Cuello',
    'Cabrito entero', 'Cabrito para fritanga', 'Hueso para sopa',
  ],
  MARISCO: [
    'Camarón entero', 'Camarón pelado', 'Camarón tigre', 'Camarón titi',
    'Langostino', 'Langosta',
    'Pulpo entero', 'Pulpo en rodajas', 'Calamar entero', 'Calamar en anillos',
    'Mejillón', 'Almeja', 'Ostras', 'Cangrejo', 'Caracol', 'Jaiba',
    'Mix de mariscos', 'Cazuela de mariscos',
  ],
  OTRO: [
    'Conejo entero', 'Conejo despresado', 'Pavo entero', 'Pechuga de pavo',
    'Pato entero', 'Codorniz', 'Cuy', 'Chigüiro',
  ],
};

export interface Category {
  id: number;
  name: string;
  color: string;
  active: boolean;
  description: string | null;
  cookingMethods: CookingMethod[];
  animalType: AnimalType | null;
  animalPart: string | null;
  parentId: number | null;
  parent?: { id: number; name: string } | null;
  children?: Array<{ id: number; name: string }>;
  _count?: { products: number };
}

export async function list(showAll = false): Promise<Category[]> {
  const res = await client.get('/categories', { params: showAll ? { active: 'all' } : {} });
  return res.data;
}

export async function create(data: Partial<Category>): Promise<Category> {
  const res = await client.post('/categories', data);
  return res.data;
}

export async function update(id: number, data: Partial<Category>): Promise<Category> {
  const res = await client.put(`/categories/${id}`, data);
  return res.data;
}

export async function remove(id: number): Promise<void> {
  await client.delete(`/categories/${id}`);
}
