import cron, { ScheduledTask } from "node-cron";
import { log } from "../config/logger";

type JobHandler = () => Promise<void> | void;

interface JobDef {
  name: string;
  schedule: string;
  handler: JobHandler;
}

const jobs = new Map<string, { def: JobDef; task: ScheduledTask | null }>();

export function register(name: string, schedule: string, handler: JobHandler): void {
  if (!cron.validate(schedule)) {
    log.error(`[cron] Schedule inválido para "${name}": ${schedule}`);
    return;
  }
  jobs.set(name, { def: { name, schedule, handler }, task: null });
}

export function start(): void {
  if (process.env.ENABLE_CRON === "false") {
    log.info("[cron] Deshabilitado por ENABLE_CRON=false");
    return;
  }
  for (const [name, entry] of jobs.entries()) {
    if (entry.task) continue;
    entry.task = cron.schedule(entry.def.schedule, async () => {
      try {
        await entry.def.handler();
      } catch (err: any) {
        log.error(`[cron] ${name} falló: ${err.message}`);
      }
    });
    log.ok(`[cron] ${name} programado (${entry.def.schedule})`);
  }
}

export function stop(): void {
  for (const [, entry] of jobs.entries()) {
    if (entry.task) {
      entry.task.stop();
      entry.task = null;
    }
  }
}

export async function runNow(name: string): Promise<void> {
  const entry = jobs.get(name);
  if (!entry) throw new Error(`Job "${name}" no registrado`);
  await entry.def.handler();
}

export function list(): { name: string; schedule: string; running: boolean }[] {
  return Array.from(jobs.values()).map((e) => ({
    name: e.def.name,
    schedule: e.def.schedule,
    running: e.task !== null,
  }));
}
