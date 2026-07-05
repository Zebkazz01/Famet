import client from './client';
import type { AnimalType } from './categories';

export interface AnimalPartItem {
  name: string;
  custom: boolean;
  id?: number;
}

export async function list(type: AnimalType): Promise<AnimalPartItem[]> {
  const res = await client.get('/animal-parts', { params: { type } });
  return res.data.items;
}

export async function create(animalType: AnimalType, name: string): Promise<AnimalPartItem> {
  const res = await client.post('/animal-parts', { animalType, name });
  return res.data;
}

export async function remove(id: number): Promise<void> {
  await client.delete(`/animal-parts/${id}`);
}
