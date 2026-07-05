import { useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { getRootSocket } from '../lib/socket';
import { useConfig } from '../contexts/ConfigContext';
import { UpdateAvailableToast } from '../components/UpdateAvailableToast';

interface ConfigUpdatedPayload {
  keys: string[];
  configVersion: number;
  logoVersion?: number;
}

async function performUpdate() {
  toast.dismiss('config-update');
  try {
    if ('caches' in window) {
      const names = await caches.keys();
      await Promise.all(names.map((n) => caches.delete(n)));
    }
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.update()));
    }
  } catch {}
  window.location.reload();
}

/**
 * Escucha cambios en SystemConfig vía Socket.IO. Si logo o configVersion cambia,
 * muestra toast persistente "Nueva versión disponible".
 */
export function useConfigVersion() {
  const { config, reload } = useConfig();
  const lastVersionRef = useRef<number>(config.configVersion);
  const lastLogoVersionRef = useRef<number>(config.logoVersion);

  useEffect(() => {
    lastVersionRef.current = config.configVersion;
    lastLogoVersionRef.current = config.logoVersion;
  }, [config.configVersion, config.logoVersion]);

  useEffect(() => {
    const socket = getRootSocket();
    if (!socket) return; // Demo mode - no WebSocket

    const onUpdate = (payload: ConfigUpdatedPayload) => {
      const newVersion = payload.configVersion;
      const newLogoVersion = payload.logoVersion ?? lastLogoVersionRef.current;
      const logoChanged = newLogoVersion > lastLogoVersionRef.current;
      const configChanged = newVersion > lastVersionRef.current;

      if (!configChanged && !logoChanged) return;

      // Recargar config inmediatamente (actualiza nombre/dirección sin reload completo)
      reload();

      // Solo mostrar toast disruptivo si cambió logo (impacta PWA cached icons)
      if (logoChanged) {
        toast.custom(
          (t) => (
            <UpdateAvailableToast
              onUpdate={() => performUpdate()}
              onDismiss={() => toast.dismiss(t.id)}
              message="El logo del negocio cambió. Recarga para ver el nuevo icono en la app y notificaciones."
            />
          ),
          { id: 'config-update', duration: Infinity, position: 'top-right' },
        );
      }
    };

    socket.on('config:updated', onUpdate);
    return () => { socket.off('config:updated', onUpdate); };
  }, [reload]);
}
