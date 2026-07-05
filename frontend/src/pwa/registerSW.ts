export function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    console.warn('[PWA] Navegador no soporta Service Workers');
    return;
  }

  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      });

      console.log('[PWA] SW registrado - scope:', registration.scope);

      // Auto-actualizar SW cuando hay nueva versión
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'activated' && navigator.serviceWorker.controller) {
              console.log('[PWA] Nueva versión disponible, recargando...');
              window.location.reload();
            }
          });
        }
      });

      // Buscar actualizaciones cada 30 segundos
      setInterval(() => registration.update(), 30000);
    } catch (err) {
      console.error('[PWA] Error registrando SW:', err);
    }
  });
}
