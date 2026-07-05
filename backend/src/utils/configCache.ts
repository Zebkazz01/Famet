import { prisma } from "../config/database";

type ConfigMap = Record<string, string>;

let cache: ConfigMap = {};
let loaded = false;
let loadPromise: Promise<void> | null = null;

async function loadFromDb(): Promise<void> {
  const rows = await prisma.systemConfig.findMany();
  const next: ConfigMap = {};
  for (const row of rows) next[row.key] = row.value;
  cache = next;
  loaded = true;
}

export async function ensureLoaded(): Promise<void> {
  if (loaded) return;
  if (!loadPromise) loadPromise = loadFromDb().finally(() => { loadPromise = null; });
  await loadPromise;
}

export function getAll(): ConfigMap {
  return { ...cache };
}

export function get(key: string): string | undefined {
  return cache[key];
}

export function getNumber(key: string, fallback: number): number {
  const raw = cache[key];
  if (raw === undefined) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function getBool(key: string, fallback: boolean): boolean {
  const raw = cache[key];
  if (raw === undefined) return fallback;
  return raw === "true" || raw === "1";
}

export async function set(key: string, value: string): Promise<void> {
  await prisma.systemConfig.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });
  cache[key] = value;
}

export async function setMany(entries: Record<string, string>): Promise<void> {
  for (const [key, value] of Object.entries(entries)) {
    await prisma.systemConfig.upsert({
      where: { key },
      update: { value: String(value) },
      create: { key, value: String(value) },
    });
    cache[key] = String(value);
  }
}

export async function bumpVersion(key: string): Promise<number> {
  const current = getNumber(key, 0);
  const next = current + 1;
  await set(key, String(next));
  return next;
}

export function invalidate(): void {
  loaded = false;
  cache = {};
}
