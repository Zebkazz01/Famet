import client from './client';

export async function getAll(): Promise<Record<string, any>> {
  const res = await client.get('/preferences');
  return res.data;
}

export async function getOne<T = any>(key: string): Promise<T | null> {
  const res = await client.get(`/preferences/${encodeURIComponent(key)}`);
  return res.data.value as T;
}

export async function setOne<T = any>(key: string, value: T): Promise<void> {
  await client.put(`/preferences/${encodeURIComponent(key)}`, { value });
}

export async function remove(key: string): Promise<void> {
  await client.delete(`/preferences/${encodeURIComponent(key)}`);
}
