import { useEffect, useState, useMemo } from 'react';
import toast from 'react-hot-toast';
import { Database, ArrowsClockwise, FloppyDisk, ArrowCounterClockwise, Warning, MagnifyingGlass, Funnel } from '@phosphor-icons/react';
import client from '../api/client';
import { PageHeader } from '../components/layout/PageHeader';
import { FilterPanel } from '../components/FilterSection';
import { Portal } from '../components/Portal';
import { formatDateTime } from '../utils/formatters';
import { useModalEscape } from '../contexts/ModalStackContext';

interface BackupFile { name: string; size: number; modifiedAt: string }

export function BackupsPage() {
  const [list, setList] = useState<BackupFile[]>([]);
  const [running, setRunning] = useState(false);
  const [confirmRestore, setConfirmRestore] = useState<BackupFile | null>(null);
  const [restoreText, setRestoreText] = useState('');
  const [dropFirst, setDropFirst] = useState(true);
  const [restoring, setRestoring] = useState(false);
  const [search, setSearch] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Global Ctrl+Shift+F
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.ctrlKey && e.shiftKey && e.key === 'F') {
        e.preventDefault();
        setFiltersOpen((prev) => !prev);
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  useModalEscape(confirmRestore ? () => setConfirmRestore(null) : null);

  const load = () => client.get('/backup/list').then((r) => setList(r.data)).catch(() => {});
  useEffect(() => { load(); }, []);

  async function runNow() {
    setRunning(true);
    try {
      const r = await client.post('/backup/run');
      toast.success(`Backup creado: ${(r.data.size / 1024).toFixed(1)} KB`);
      load();
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Error en backup');
    } finally {
      setRunning(false);
    }
  }

  async function doRestore() {
    if (!confirmRestore) return;
    if (restoreText !== 'RESTAURAR') return;
    setRestoring(true);
    try {
      const r = await client.post('/backup/restore', { fileName: confirmRestore.name, dropFirst });
      toast.success(`Restaurado. Safety backup: ${r.data.safetyBackup}`);
      setConfirmRestore(null);
      setRestoreText('');
      load();
      // Recargar después de unos segundos para refrescar el frontend con datos nuevos
      setTimeout(() => window.location.reload(), 1500);
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Error en restore');
    } finally {
      setRestoring(false);
    }
  }

  function fmtSize(n: number) {
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
    return `${(n / 1024 / 1024).toFixed(1)} MB`;
  }

  const filteredList = useMemo(() => {
    if (!search) return list;
    const q = search.toLowerCase();
    return list.filter((b) => b.name.toLowerCase().includes(q));
  }, [list, search]);

  return (
    <div className="flex flex-col h-full p-3 md:p-6">
      <PageHeader
        icon={<Database size={24} weight="duotone" />}
        title="Backups"
        description="Copias de seguridad automáticas de la base de datos. Se ejecutan a las 02:00 todos los días (configurable con BACKUP_CRON) y se retienen 14 días por defecto (BACKUP_RETENTION). Genera dumps PostgreSQL con pg_dump en formato custom (.dump) restaurables con pg_restore."
        actions={
          <>
            <button
              onClick={() => setFiltersOpen((prev) => !prev)}
              className={`inline-flex items-center gap-1.5 px-3 h-9 rounded-lg text-xs font-medium transition-colors border ${
                filtersOpen || search
                  ? 'bg-red-50 border-red-300 text-red-600 dark:bg-red-900/20 dark:border-red-700 dark:text-red-400'
                  : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700'
              }`}
              title="Filtros (Ctrl+Shift+F)"
            >
              <Funnel size={14} weight="duotone" />
              <span className="hidden sm:inline">Filtros</span>
              {search && (
                <span className="inline-flex items-center justify-center w-5 h-5 text-[10px] font-bold bg-red-500 text-white rounded-full">1</span>
              )}
            </button>
            <button id="backups-btn" onClick={runNow} disabled={running}
              className="inline-flex items-center gap-1.5 bg-red-500 text-white px-3 py-2 rounded-lg hover:bg-red-600 disabled:opacity-50 text-xs md:text-sm">
              <ArrowsClockwise size={16} weight={running ? 'fill' : 'bold'} className={running ? 'animate-spin' : ''} />
              {running ? 'Generando...' : 'Backup ahora'}
            </button>
          </>
        }
      />

      <FilterPanel open={filtersOpen}>
        <div className="relative flex-1 max-w-xs">
          <MagnifyingGlass size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar backup..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-700 dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400"
          />
        </div>
        <span className="text-xs text-gray-400">{filteredList.length} backup(s)</span>
      </FilterPanel>

      <div className="flex-1 overflow-auto styled-scroll">
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-900/40 rounded-lg p-3 mb-4 text-xs text-blue-900 dark:text-blue-200">
        <strong>Restaurar:</strong> <code className="bg-white dark:bg-slate-800 px-1 rounded">pg_restore -U postgres -d fameat_pos backups/&lt;archivo&gt;.dump</code>
      </div>

      <div id="backups-list" className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        {list.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4">
            <div className="w-16 h-16 bg-gray-100 dark:bg-slate-700 rounded-full flex items-center justify-center mb-4">
              <Database size={32} weight="duotone" className="text-gray-400" />
            </div>
            <p className="font-semibold text-gray-700 dark:text-gray-200 mb-1">Aún no hay backups</p>
            <p className="text-sm text-gray-400 mb-4">Genera el primer backup para proteger tus datos</p>
            <button id="backups-btn-empty" onClick={runNow} disabled={running}
              className="inline-flex items-center gap-1.5 bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 disabled:opacity-50 text-sm font-medium transition-colors">
              <ArrowsClockwise size={16} weight={running ? 'fill' : 'bold'} className={running ? 'animate-spin' : ''} />
              {running ? 'Generando...' : 'Backup ahora'}
            </button>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-slate-900/50">
              <tr>
                <th className="text-left px-3 py-2 text-[10px] uppercase font-bold text-gray-500">Archivo</th>
                <th className="text-right px-3 py-2 text-[10px] uppercase font-bold text-gray-500">Tamaño</th>
                <th className="text-left px-3 py-2 text-[10px] uppercase font-bold text-gray-500">Fecha</th>
                <th className="text-right px-3 py-2 text-[10px] uppercase font-bold text-gray-500">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {list.map((b) => (
                <tr key={b.name} className="hover:bg-gray-50 dark:hover:bg-slate-700/40">
                  <td className="px-3 py-2 font-mono text-xs">
                    <span className="flex items-center gap-2"><FloppyDisk size={14} weight="duotone" className="text-gray-400" /> {b.name}</span>
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-xs">{fmtSize(b.size)}</td>
                  <td className="px-3 py-2 text-xs text-gray-500">{formatDateTime(b.modifiedAt)}</td>
                  <td className="px-3 py-2 text-right">
                    <button onClick={() => { setConfirmRestore(b); setRestoreText(''); setDropFirst(true); }}
                      title="Restaurar este backup"
                      className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-300">
                      <ArrowCounterClockwise size={12} weight="bold" /> Restaurar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal confirmación restore */}
      {confirmRestore && (<Portal>
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4" onClick={() => !restoring && setConfirmRestore(null)}>
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-4 bg-amber-50 dark:bg-amber-900/30 border-b border-amber-200 dark:border-amber-900/50 flex items-start gap-3">
              <Warning size={24} weight="duotone" className="text-amber-600 flex-shrink-0" />
              <div>
                <h3 className="font-bold text-amber-900 dark:text-amber-200">Restaurar backup</h3>
                <p className="text-xs text-amber-800 dark:text-amber-300 mt-1">
                  Esta operación reemplaza la base de datos actual con el contenido del backup. Se genera automáticamente un <strong>backup de seguridad</strong> antes de proceder.
                </p>
              </div>
            </div>

            <div className="p-5 space-y-3">
              <div className="bg-gray-50 dark:bg-slate-900/50 rounded-lg p-3 text-xs font-mono">
                {confirmRestore.name}<br/>
                <span className="text-gray-500">{fmtSize(confirmRestore.size)} · {formatDateTime(confirmRestore.modifiedAt)}</span>
              </div>

              <label className="flex items-center gap-2 text-xs">
                <input type="checkbox" checked={dropFirst} onChange={(e) => setDropFirst(e.target.checked)} />
                <span><strong>--clean</strong>: limpiar BD antes de restaurar (recomendado)</span>
              </label>

              <div>
                <label className="block text-xs font-medium mb-1 text-red-600">
                  Para confirmar escribe <span className="font-mono font-bold">RESTAURAR</span>:
                </label>
                <input type="text" value={restoreText} onChange={(e) => setRestoreText(e.target.value)}
                  className="w-full px-3 py-2 border-2 border-red-300 dark:bg-slate-700 rounded-lg text-sm font-mono"
                  placeholder="RESTAURAR" />
              </div>

              <p className="text-[10px] text-gray-500">
                Después del restore el navegador recargará automáticamente.
              </p>
            </div>

            <div className="px-5 py-3 bg-gray-50 dark:bg-slate-900/50 flex gap-2">
              <button onClick={() => setConfirmRestore(null)} disabled={restoring}
                className="flex-1 py-2 border rounded-lg text-sm dark:border-gray-600 disabled:opacity-50">
                Cancelar
              </button>
              <button onClick={doRestore} disabled={restoreText !== 'RESTAURAR' || restoring}
                className="flex-1 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-40 inline-flex items-center justify-center gap-1.5">
                <ArrowCounterClockwise size={14} weight="bold" /> {restoring ? 'Restaurando...' : 'Restaurar'}
              </button>
            </div>
          </div>
        </div>
      </Portal>)}
      </div>
    </div>
  );
}
