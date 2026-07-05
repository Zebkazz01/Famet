import { useState } from 'react';
import { useInstallPrompt } from './useInstallPrompt';
import { useConfig } from '../contexts/ConfigContext';
import { DownloadSimple, X, DotsThreeVertical, Plus, Export } from '@phosphor-icons/react';

const DISMISS_KEY = 'pwa-banner-dismissed';
// TTL del dismiss: 7 días. Pasado este tiempo el banner vuelve a aparecer.
const DISMISS_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function isDismissedActive(): boolean {
  const raw = localStorage.getItem(DISMISS_KEY);
  if (!raw) return false;
  // Compat con valor legacy "1" sin timestamp: tratar como dismiss reciente para limpiar
  if (raw === '1') {
    localStorage.removeItem(DISMISS_KEY);
    return false;
  }
  const ts = Number(raw);
  if (!Number.isFinite(ts)) return false;
  if (Date.now() - ts > DISMISS_TTL_MS) {
    localStorage.removeItem(DISMISS_KEY);
    return false;
  }
  return true;
}

export function InstallBanner() {
  const { canInstall, isIOS, install, hasNativePrompt } = useInstallPrompt();
  const { config } = useConfig();
  const logo = config.businessLogo || '/pwa/icons/icon-any-96.png';
  const [dismissed, setDismissed] = useState(() => isDismissedActive());
  const [showGuide, setShowGuide] = useState(false);

  if (!canInstall || dismissed) return null;

  const handleClose = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setDismissed(true);
  };

  return (
    <>
      {/* Banner compacto */}
      <div className="fixed bottom-0 left-0 right-0 z-[99998]"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        <div className="bg-white text-gray-900 flex items-center justify-between px-4 py-3 shadow-[0_-4px_20px_rgba(0,0,0,0.1)] border-t border-gray-100 relative">
          <button onClick={handleClose}
            className="absolute top-1/2 left-2 -translate-y-1/2 text-gray-400 hover:text-gray-700 p-1">
            <X size={16} weight="bold" />
          </button>

          <div className="flex items-center gap-3 flex-1 min-w-0 pl-6">
            <img src={logo} alt={config.businessName}
              className="w-10 h-10 rounded-xl flex-shrink-0 object-cover shadow-sm" />
            <div className="min-w-0">
              <strong className="text-sm font-bold text-gray-900 block truncate">Instalar {config.businessName}</strong>
              <span className="text-[11px] text-gray-500">Acceso rapido desde tu pantalla</span>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0 ml-3">
            {hasNativePrompt ? (
              <button onClick={install}
                className="bg-red-500 hover:bg-red-600 text-white rounded-lg px-4 py-2 text-sm font-bold flex items-center gap-1.5 transition-colors">
                <DownloadSimple size={16} weight="duotone" /> Instalar
              </button>
            ) : (
              <button onClick={() => setShowGuide(true)}
                className="bg-red-500 hover:bg-red-600 text-white rounded-lg px-4 py-2 text-sm font-bold flex items-center gap-1.5 transition-colors">
                <DownloadSimple size={16} weight="duotone" /> Instalar
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Guía de instalación manual */}
      {showGuide && (
        <div className="fixed inset-0 z-[99999] bg-black/60 backdrop-blur-sm flex items-end justify-center"
          onClick={() => setShowGuide(false)}>
          <div className="bg-white w-full max-w-md rounded-t-2xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}>
            <div className="p-5">
              <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-4" />
              <div className="text-center mb-5">
                <img src={logo} alt={config.businessName}
                  className="w-14 h-14 rounded-xl mx-auto mb-3 shadow-md" />
                <h3 className="font-bold text-lg">Instalar {config.businessName}</h3>
                <p className="text-sm text-gray-500 mt-1">Sigue estos pasos para instalar la app</p>
              </div>

              {isIOS ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
                    <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center flex-shrink-0 font-bold text-sm">1</div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Toca el boton Compartir</p>
                      <p className="text-[11px] text-gray-400 flex items-center gap-1 mt-0.5">
                        <Export size={12} /> en la barra inferior de Safari
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
                    <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center flex-shrink-0 font-bold text-sm">2</div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Selecciona "Agregar a inicio"</p>
                      <p className="text-[11px] text-gray-400 flex items-center gap-1 mt-0.5">
                        <Plus size={12} /> Agregar a pantalla de inicio
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
                    <div className="w-8 h-8 bg-green-100 text-green-600 rounded-lg flex items-center justify-center flex-shrink-0 font-bold text-sm">3</div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Toca "Agregar"</p>
                      <p className="text-[11px] text-gray-400 mt-0.5">La app aparecera en tu pantalla de inicio</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
                    <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center flex-shrink-0 font-bold text-sm">1</div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Toca el menu del navegador</p>
                      <p className="text-[11px] text-gray-400 flex items-center gap-1 mt-0.5">
                        <DotsThreeVertical size={14} weight="bold" /> Los tres puntos en la esquina superior
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
                    <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center flex-shrink-0 font-bold text-sm">2</div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Selecciona "Instalar app"</p>
                      <p className="text-[11px] text-gray-400 mt-0.5">O "Agregar a pantalla de inicio"</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
                    <div className="w-8 h-8 bg-green-100 text-green-600 rounded-lg flex items-center justify-center flex-shrink-0 font-bold text-sm">3</div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Confirma la instalacion</p>
                      <p className="text-[11px] text-gray-400 mt-0.5">La app se abrira como aplicacion independiente</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-2 mt-5">
                <button onClick={() => setShowGuide(false)}
                  className="flex-1 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors">
                  Ahora no
                </button>
                <button onClick={handleClose}
                  className="flex-1 py-2.5 bg-gray-100 text-gray-500 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors">
                  No mostrar mas
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
