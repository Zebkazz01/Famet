import { useState } from 'react';
import { useScale } from '../contexts/ScaleContext';
import { useConfig } from '../contexts/ConfigContext';
import { Portal } from './Portal';
import toast from 'react-hot-toast';
import { useModalEscape } from '../contexts/ModalStackContext';

export function ScaleConnectionModal() {
  const { status, disabled, disableScale, reconnect, reconnecting } = useScale();
  const { config } = useConfig();
  const [showConfirm, setShowConfirm] = useState(false);

  useModalEscape(disableScale);

  async function handleReconnect() {
    const r = await reconnect();
    if (r.ok) {
      toast.success(`Balanza reconectada${r.port ? ` en ${r.port}` : ''}`);
    } else {
      toast.error(r.error || 'No se pudo reconectar');
    }
  }

  // No mostrar si ya conectó, si está deshabilitada, o si ya pasó el flujo
  if (status === 'connected' || disabled) return null;

  return (
    <Portal><div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {!showConfirm ? (
          <>
            {/* Header */}
            <div className="bg-red-500 px-6 py-4">
              <h2 className="text-white text-lg font-bold text-center">{config.businessName}</h2>
            </div>

            <div className="p-6 text-center">
              {/* Animación de la balanza */}
              <div className="mb-6">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-red-50 mb-4">
                  <svg className="w-10 h-10 text-red-500 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1.5M12 19.5V21M3 12h1.5M19.5 12H21M5.636 5.636l1.06 1.06M17.303 17.303l1.06 1.06M5.636 18.364l1.06-1.06M17.303 6.697l1.06-1.06" />
                    <circle cx="12" cy="12" r="4" />
                  </svg>
                </div>

                <h3 className="text-xl font-bold text-gray-800 mb-2">
                  Conectando balanza...
                </h3>
                <p className="text-gray-500 text-sm">
                  Se detectó la balanza conectada al equipo.
                  <br />
                  Estableciendo comunicación con el sistema.
                </p>
              </div>

              {/* Indicador de progreso */}
              <div className="mb-6">
                <div className="flex items-center justify-center gap-2 mb-3">
                  <div className="flex gap-1">
                    <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
                <p className="text-xs text-gray-400">
                  {status === 'connecting' ? 'Intentando conexión...' : 'Esperando respuesta del servidor...'}
                </p>
              </div>

              {/* Acciones */}
              <div className="flex flex-col gap-2">
                <button
                  onClick={handleReconnect}
                  disabled={reconnecting}
                  className="w-full px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium disabled:opacity-50 transition-colors inline-flex items-center justify-center gap-2"
                >
                  {reconnecting ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
                        <path fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                      </svg>
                      Reconectando...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                      </svg>
                      Re-detectar puerto y reconectar
                    </>
                  )}
                </button>
                <p className="text-[10px] text-gray-400">
                  Util si desconectaste la balanza y la volviste a conectar en otro puerto USB
                </p>
                <button
                  onClick={() => setShowConfirm(true)}
                  className="text-gray-400 hover:text-gray-600 text-sm underline underline-offset-2 transition-colors mt-2"
                >
                  Cancelar conexión
                </button>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Confirmación */}
            <div className="bg-yellow-500 px-6 py-4">
              <h2 className="text-white text-lg font-bold text-center">Confirmar</h2>
            </div>

            <div className="p-6 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-yellow-50 mb-4">
                <svg className="w-8 h-8 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                </svg>
              </div>

              <h3 className="text-lg font-bold text-gray-800 mb-2">
                ¿Trabajar sin balanza?
              </h3>
              <p className="text-gray-500 text-sm mb-2">
                El sistema funcionará sin lectura de peso automática.
              </p>
              <p className="text-gray-400 text-xs mb-6">
                Podrás reconectar la balanza en cualquier momento desde
                <span className="font-medium text-gray-600"> Configuración &gt; Balanza</span>.
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirm(false)}
                  className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium transition-colors"
                >
                  Volver a intentar
                </button>
                <button
                  onClick={disableScale}
                  className="flex-1 px-4 py-2.5 bg-red-500 text-white rounded-lg hover:bg-red-600 font-medium transition-colors"
                >
                  Sí, continuar sin balanza
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div></Portal>
  );
}
