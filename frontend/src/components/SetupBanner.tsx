import { useState, useEffect } from 'react';
import { WarningCircle, Database, Terminal, ArrowRight } from '@phosphor-icons/react';
import { Portal } from './Portal';

type Status = 'loading' | 'ok' | 'no-backend' | 'no-db' | 'no-seed';

export function SetupBanner() {
  const [status, setStatus] = useState<Status>('loading');
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    checkHealth();
  }, []);

  async function checkHealth() {
    try {
      const res = await fetch('/api/health', { signal: AbortSignal.timeout(5000) });
      if (!res.ok) {
        setStatus('no-backend');
        return;
      }
      const data = await res.json();
      if (!data.database) {
        setStatus('no-db');
      } else if (!data.initialized) {
        setStatus('no-seed');
      } else {
        setStatus('ok');
      }
    } catch {
      setStatus('no-backend');
    }
  }

  if (status === 'loading' || status === 'ok' || dismissed) return null;

  const config: Record<string, { title: string; desc: string; steps: string[] }> = {
    'no-backend': {
      title: 'Backend no disponible',
      desc: 'No se pudo conectar al servidor. Asegurate de que el backend esté corriendo.',
      steps: [
        'cd backend',
        'npm install',
        'npm run dev',
      ],
    },
    'no-db': {
      title: 'Base de datos no conectada',
      desc: 'El backend está activo pero no se pudo conectar a PostgreSQL.',
      steps: [
        'Verificar que PostgreSQL esté corriendo',
        'Verificar DATABASE_URL en backend/.env',
        'npx prisma migrate deploy',
      ],
    },
    'no-seed': {
      title: 'Proyecto no inicializado',
      desc: 'La base de datos está conectada pero no tiene datos iniciales (usuarios, etc).',
      steps: [
        'cd backend',
        'npx prisma db seed',
      ],
    },
  };

  const c = config[status];

  return (
    <Portal><div className="fixed inset-0 z-[99999] bg-gray-900/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="bg-amber-500 px-6 py-4 flex items-center gap-3">
          <WarningCircle size={28} weight="fill" className="text-white flex-shrink-0" />
          <h2 className="text-white font-bold text-lg">{c.title}</h2>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          <p className="text-gray-600 text-sm">{c.desc}</p>

          {/* Steps */}
          <div className="bg-gray-900 rounded-lg p-4 space-y-2">
            <div className="flex items-center gap-2 text-gray-400 text-xs font-medium mb-2">
              <Terminal size={14} />
              <span>Ejecutar en terminal:</span>
            </div>
            {c.steps.map((step, i) => (
              <div key={i} className="flex items-start gap-2 text-sm font-mono">
                <ArrowRight size={14} className="text-amber-400 mt-0.5 flex-shrink-0" />
                <code className="text-green-400">{step}</code>
              </div>
            ))}
          </div>

          <p className="text-xs text-gray-400">
            Una vez completado, recarga esta pagina.
          </p>
        </div>

        {/* Footer */}
        <div className="px-6 pb-5 flex gap-3">
          <button
            onClick={() => { setStatus('loading'); checkHealth(); }}
            className="flex-1 bg-amber-500 hover:bg-amber-600 text-white font-semibold py-2.5 px-4 rounded-lg transition-colors text-sm"
          >
            Reintentar
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="px-4 py-2.5 text-gray-500 hover:text-gray-700 text-sm font-medium transition-colors"
          >
            Ignorar
          </button>
        </div>
      </div>
    </div></Portal>
  );
}
