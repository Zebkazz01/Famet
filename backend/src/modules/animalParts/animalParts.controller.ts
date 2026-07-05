import { Request, Response } from "express";
import { prisma } from "../../config/database";
import { ANIMAL_TYPES } from "../categories/categories.schema";

/** Cortes hardcoded sugeridos por animal (Colombia). */
const DEFAULT_PARTS: Record<string, string[]> = {
  RES: [
    "Lomo fino", "Lomo ancho", "Solomito", "Punta de anca", "Punta gorda", "Chatas",
    "T-bone (lomo bajo)", "Bistec", "Churrasco", "Chocozuela",
    "Posta negra", "Posta blanca", "Muchacho", "Bola de pierna", "Bola de brazo",
    "Cadera", "Centro de pierna", "Nalga de adentro", "Nalga de afuera",
    "Costilla", "Costilla cargada", "Costilla de pecho", "Espinazo", "Cogote",
    "Murillo (osobuco)", "Lagarto", "Hueso poroso", "Hueso blanco", "Hueso carnudo",
    "Pecho", "Entrepecho", "Pajarilla", "Falda", "Malaya",
    "Sobrebarriga gruesa", "Sobrebarriga delgada", "Hígado",
    "Lengua", "Riñón", "Corazón", "Mondongo", "Pata", "Rabo",
    "Vacío", "Paletero", "Morrillo", "Sabaleta", "Bota",
    "Carne molida", "Carne para asar", "Carne para guisar", "Carne para sopa",
  ],
  CERDO: [
    "Lomo", "Lomo de cinta", "Pernil (pierna)", "Brazo (paleta)", "Espaldilla",
    "Costilla", "Costilla con tocino", "Chuleta", "Chuleta valluna", "Espinazo",
    "Bondiola (aguja)", "Cabeza de lomo", "Solomo",
    "Tocino barriguero (panceta)", "Tocino carnudo", "Tocino para chicharrón",
    "Tocineta", "Manteca",
    "Chicharrón", "Lechona entera", "Cojín de lechona", "Lechona pequeña",
    "Costillas BBQ", "Pernil deshuesado", "Pernil ahumado",
    "Chorizo", "Chorizo santarrosano", "Morcilla", "Longaniza", "Salchichón",
    "Butifarra", "Salchicha",
    "Cabeza", "Oreja", "Patas", "Cola", "Rabo", "Hígado", "Riñón", "Corazón",
  ],
  POLLO: [
    "Pollo entero", "Pollo despresado", "Medio pollo",
    "Pechuga entera", "Pechuga deshuesada", "Filete de pechuga", "Tira de pechuga",
    "Pierna pernil (jamoncillo)", "Muslo", "Contramuslo", "Pierna sin muslo",
    "Alas enteras", "Alitas BBQ", "Apastelado",
    "Costillar", "Rabadilla", "Espinazo",
    "Menudencias", "Hígado", "Molleja", "Corazón", "Patas", "Cabeza", "Pescuezo",
    "Pollo asado", "Pollo broaster", "Pechuga apanada", "Nuggets",
  ],
  PESCADO: [
    "Bocachico", "Bagre", "Bagre rayado (pintadillo)", "Capaz", "Nicuro",
    "Sabaleta", "Cachama", "Yamú", "Dorada (mueluda)", "Blanquillo", "Arenca",
    "Tilapia roja", "Tilapia plateada (mojarra)", "Trucha arcoíris",
    "Pargo rojo", "Pargo platero", "Sierra", "Atún", "Atún aleta amarilla",
    "Merluza", "Corvina", "Róbalo", "Lebranche", "Pacora", "Lisa", "Jurel",
    "Cherna", "Salmón", "Sardina",
    "Entero", "Filete", "Posta", "Lomo", "Cola", "Cabeza", "Mariposa",
    "Anillos", "Apanado",
  ],
  CORDERO: [
    "Pierna", "Costillar", "Lomo", "Espaldilla", "Cuello", "Chuleta",
    "Falda", "Pecho", "Pulpa", "Hueso para sopa",
  ],
  CABRA: [
    "Pierna", "Costillar", "Lomo", "Espaldilla", "Cuello",
    "Cabrito entero", "Cabrito para fritanga", "Hueso para sopa",
  ],
  MARISCO: [
    "Camarón entero", "Camarón pelado", "Camarón tigre", "Camarón titi",
    "Langostino", "Langosta",
    "Pulpo entero", "Pulpo en rodajas", "Calamar entero", "Calamar en anillos",
    "Mejillón", "Almeja", "Ostras", "Cangrejo", "Caracol", "Jaiba",
    "Mix de mariscos", "Cazuela de mariscos",
  ],
  OTRO: [
    "Conejo entero", "Conejo despresado", "Pavo entero", "Pechuga de pavo",
    "Pato entero", "Codorniz", "Cuy", "Chigüiro",
  ],
};

/** GET /api/animal-parts?type=RES → merge defaults + custom DB */
export async function list(req: Request, res: Response) {
  const type = String(req.query.type || "").toUpperCase();
  if (!ANIMAL_TYPES.includes(type as any)) {
    return res.json({ items: [] });
  }
  const defaults = (DEFAULT_PARTS[type] || []).map((name) => ({ name, custom: false }));
  const custom = await prisma.animalPart.findMany({
    where: { animalType: type as any },
    orderBy: { name: "asc" },
  });
  // Merge sin duplicar names (case-insensitive)
  const seen = new Set(defaults.map((d) => d.name.toLowerCase()));
  const merged = [...defaults];
  for (const c of custom) {
    if (!seen.has(c.name.toLowerCase())) {
      merged.push({ name: c.name, custom: true });
      seen.add(c.name.toLowerCase());
    }
  }
  return res.json({ items: merged });
}

/** POST /api/animal-parts { animalType, name } → crea custom */
export async function create(req: Request, res: Response) {
  const animalType = String(req.body?.animalType || "").toUpperCase();
  const name = String(req.body?.name || "").trim();
  if (!ANIMAL_TYPES.includes(animalType as any)) {
    return res.status(400).json({ error: "Tipo de animal inválido" });
  }
  if (!name) return res.status(400).json({ error: "Nombre requerido" });
  // Si ya existe en defaults, no crear duplicado en DB
  const defaultsForType = DEFAULT_PARTS[animalType] || [];
  if (defaultsForType.some((d) => d.toLowerCase() === name.toLowerCase())) {
    return res.json({ name, custom: false, alreadyDefault: true });
  }
  const item = await prisma.animalPart.upsert({
    where: { animalType_name: { animalType: animalType as any, name } },
    update: {},
    create: { animalType: animalType as any, name, custom: true },
  });
  return res.status(201).json({ id: item.id, name: item.name, custom: true });
}

/** DELETE /api/animal-parts/:id → solo customs */
export async function remove(req: Request, res: Response) {
  const id = Number(req.params.id);
  await prisma.animalPart.delete({ where: { id } });
  return res.json({ message: "Eliminado" });
}
