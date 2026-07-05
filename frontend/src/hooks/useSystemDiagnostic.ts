import { useEffect, useRef } from 'react';
import toast from 'react-hot-toast';

const DIAG_KEY = 'fameat-diagnostic-done';

interface HealthResponse {
  status: string;
  database: boolean;
  scale: boolean;
  uptime: number;
}

interface DiagResult {
  label: string;
  ok: boolean;
  detail: string;
}

export function useSystemDiagnostic() {
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    // Solo ejecutar si nunca se ha hecho diagnóstico en esta sesión/dispositivo
    if (localStorage.getItem(DIAG_KEY)) return;

    runDiagnostic().then(() => {
      localStorage.setItem(DIAG_KEY, new Date().toISOString());
    });
  }, []);
}

/** Limpia la memoria para forzar re-ejecución del diagnóstico */
export function resetDiagnosticMemory() {
  localStorage.removeItem(DIAG_KEY);
}

async function runDiagnostic() {
  await new Promise((r) => setTimeout(r, 800));

  const results: DiagResult[] = [];

  // 1. Frontend siempre OK si llegamos aquí
  results.push({ label: 'Frontend', ok: true, detail: 'Activo' });

  // 2. Backend + DB + Balanza via /api/health
  try {
    const res = await fetch('/api/health', { signal: AbortSignal.timeout(5000) });
    if (res.ok) {
      const health: HealthResponse = await res.json();
      results.push({ label: 'Backend', ok: true, detail: `Uptime ${health.uptime}s` });
      results.push({
        label: 'Base de datos',
        ok: health.database,
        detail: health.database ? 'Conectada' : 'Sin conexión',
      });
      results.push({
        label: 'Balanza',
        ok: health.scale,
        detail: health.scale ? 'Conectada' : 'No detectada',
      });
    } else {
      results.push({ label: 'Backend', ok: false, detail: `Error ${res.status}` });
      results.push({ label: 'Base de datos', ok: false, detail: 'Sin backend' });
      results.push({ label: 'Balanza', ok: false, detail: 'Sin backend' });
    }
  } catch {
    results.push({ label: 'Backend', ok: false, detail: 'No responde' });
    results.push({ label: 'Base de datos', ok: false, detail: 'Sin backend' });
    results.push({ label: 'Balanza', ok: false, detail: 'Sin backend' });
  }

  // 3. PWA status
  const hasSW = 'serviceWorker' in navigator;
  let swRegistered = false;
  if (hasSW) {
    try {
      const regs = await navigator.serviceWorker.getRegistrations();
      swRegistered = regs.length > 0;
    } catch {}
  }
  const isInstalled =
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as any).standalone === true;

  results.push({
    label: 'PWA',
    ok: swRegistered,
    detail: isInstalled ? 'Instalada' : swRegistered ? 'Lista para instalar' : 'SW pendiente',
  });

  // Mostrar toasts secuenciales
  const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

  for (const r of results) {
    if (r.ok) {
      toast.success(`${r.label}: ${r.detail}`, {
        duration: 4000,
        style: { background: '#1e293b', color: '#e2e8f0', fontSize: '13px', border: '1px solid #334155' },
        iconTheme: { primary: '#22c55e', secondary: '#1e293b' },
      });
    } else {
      const isCritical = r.label === 'Backend' || r.label === 'Base de datos';
      if (isCritical) {
        toast.error(`${r.label}: ${r.detail}`, {
          duration: 6000,
            style: { background: '#1e293b', color: '#e2e8f0', fontSize: '13px', border: '1px solid #7f1d1d' },
          iconTheme: { primary: '#ef4444', secondary: '#1e293b' },
        });
      } else {
        toast(`${r.label}: ${r.detail}`, {
          duration: 4000,
            icon: '\u26A0\uFE0F',
          style: { background: '#1e293b', color: '#e2e8f0', fontSize: '13px', border: '1px solid #854d0e' },
        });
      }
    }
    await delay(300);
  }
}
