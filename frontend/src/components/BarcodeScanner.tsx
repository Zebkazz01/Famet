import { useEffect, useRef, useState } from 'react';
import { Camera, X, Barcode, ArrowsClockwise } from '@phosphor-icons/react';
import { Portal } from './Portal';
import { BrowserMultiFormatReader } from '@zxing/browser';

export function playBeep(success: boolean) {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = success ? 1200 : 400;
    gain.gain.value = 0.3;
    osc.start();
    osc.stop(ctx.currentTime + (success ? 0.15 : 0.3));
    if (!success) {
      setTimeout(() => {
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.frequency.value = 300;
        gain2.gain.value = 0.3;
        osc2.start();
        osc2.stop(ctx.currentTime + 0.2);
      }, 200);
    }
  } catch {}
}

interface BarcodeScannerProps {
  onScan: (code: string) => void;
  onClose: () => void;
}

interface CameraDevice {
  id: string;
  label: string;
}

export function BarcodeScanner({ onScan, onClose }: BarcodeScannerProps) {
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);

  const [cameras, setCameras] = useState<CameraDevice[]>([]);
  const [activeCamId, setActiveCamId] = useState<string>('');
  const [error, setError] = useState('');
  const [detected, setDetected] = useState<string | null>(null);
  const [torchSupported, setTorchSupported] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);

  // Listar cámaras disponibles
  useEffect(() => {
    (async () => {
      if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
        const isSecure = typeof window !== 'undefined' && (window as any).isSecureContext;
        const proto = typeof location !== 'undefined' ? location.protocol : '';
        const host = typeof location !== 'undefined' ? location.hostname : '';
        if (!isSecure && proto === 'http:' && host !== 'localhost' && host !== '127.0.0.1') {
          setError('La cámara requiere HTTPS. Usa https:// o localhost.');
        } else {
          setError('Tu navegador no soporta acceso a cámara. Usa Chrome/Edge actualizado.');
        }
        return;
      }

      try {
        const tmpStream = await navigator.mediaDevices.getUserMedia({ video: true });
        tmpStream.getTracks().forEach((t) => t.stop());

        const devices = await BrowserMultiFormatReader.listVideoInputDevices();
        const cams = devices.map((d) => ({
          id: d.deviceId,
          label: d.label || `Cámara ${d.deviceId.slice(0, 6)}`,
        }));
        if (cams.length === 0) {
          setError('No se detectaron cámaras en este dispositivo.');
          return;
        }
        setCameras(cams);
        const back = cams.find((c) => /back|rear|environment|trasera/i.test(c.label));
        setActiveCamId(back?.id || cams[0]?.id || '');
      } catch (e: any) {
        const msg = e?.message || String(e);
        if (/NotAllowedError|Permission/.test(msg)) {
          setError('Permiso de cámara denegado. Activa el permiso en el navegador.');
        } else if (/NotFoundError|Requested device not found/.test(msg)) {
          setError('No se encontró la cámara solicitada.');
        } else if (/NotReadableError|TrackStartError/.test(msg)) {
          setError('La cámara está en uso por otra aplicación (Zoom, Teams, etc.).');
        } else {
          setError('No se pudo acceder a la cámara: ' + msg);
        }
      }
    })();
  }, []);

  // Arrancar ZXing cuando se elige cámara
  useEffect(() => {
    if (!activeCamId) return;
    let cancelled = false;

    const stopCurrent = () => {
      if (controlsRef.current) {
        try { controlsRef.current.stop(); } catch {}
        controlsRef.current = null;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };

    (async () => {
      stopCurrent();
      try {
        // Obtener stream para detección de torch
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { deviceId: { exact: activeCamId }, width: { ideal: 1280 }, height: { ideal: 720 } },
        });
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;

        const track = stream.getVideoTracks()[0];
        const caps: any = track.getCapabilities ? track.getCapabilities() : {};
        setTorchSupported(!!caps.torch);
        setTorchOn(false);

        if (!videoRef.current) return;
        videoRef.current.srcObject = stream;

        const reader = new BrowserMultiFormatReader();
        const controls = await reader.decodeFromVideoDevice(
          activeCamId,
          videoRef.current,
          (result, err) => {
            if (cancelled) return;
            if (result) {
              const code = result.getText().trim();
              if (code) {
                setDetected(code);
                playBeep(true);
                try { controls.stop(); } catch {}
                controlsRef.current = null;
                onScanRef.current(code);
              }
            }
            // NotFoundException es normal (sin código en frame) — ignorar
            if (err && err.name !== 'NotFoundException') {
              console.warn('[ZXing]', err.message);
            }
          },
        );
        if (cancelled) { controls.stop(); return; }
        controlsRef.current = controls;
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'No se pudo iniciar la cámara');
      }
    })();

    return () => {
      cancelled = true;
      if (controlsRef.current) {
        try { controlsRef.current.stop(); } catch {}
        controlsRef.current = null;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      if (videoRef.current) {
        try { videoRef.current.srcObject = null; } catch {}
      }
    };
  }, [activeCamId]);

  // Cleanup al desmontar
  useEffect(() => {
    return () => {
      if (controlsRef.current) { try { controlsRef.current.stop(); } catch {} }
      if (streamRef.current) { streamRef.current.getTracks().forEach((t) => t.stop()); }
    };
  }, []);

  async function toggleTorch() {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;
    try {
      await (track as any).applyConstraints({ advanced: [{ torch: !torchOn }] });
      setTorchOn(!torchOn);
    } catch {}
  }

  function switchCamera() {
    if (cameras.length < 2) return;
    const idx = cameras.findIndex((c) => c.id === activeCamId);
    setActiveCamId(cameras[(idx + 1) % cameras.length].id);
  }

  function handleClose() {
    if (controlsRef.current) { try { controlsRef.current.stop(); } catch {} }
    if (streamRef.current) { streamRef.current.getTracks().forEach((t) => t.stop()); }
    onClose();
  }

  return (
    <Portal>
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
          <div className="px-4 py-3 border-b dark:border-gray-700 flex items-center justify-between bg-gray-50 dark:bg-slate-900">
            <div className="flex items-center gap-2">
              <Barcode size={20} weight="duotone" className="text-red-500" />
              <h3 className="font-bold text-sm dark:text-gray-100">Escanear código</h3>
              <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">ZXing</span>
            </div>
            <div className="flex items-center gap-1">
              {cameras.length > 1 && (
                <button onClick={switchCamera} title="Cambiar cámara"
                  className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-700">
                  <ArrowsClockwise size={16} weight="bold" className="text-gray-600 dark:text-gray-300" />
                </button>
              )}
              {torchSupported && (
                <button onClick={toggleTorch} title="Linterna"
                  className={`p-1.5 rounded-lg text-xs ${torchOn ? 'bg-yellow-200 text-yellow-800' : 'hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-600 dark:text-gray-300'}`}>
                  ⚡
                </button>
              )}
              <button onClick={handleClose}
                className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-400">
                <X size={18} weight="bold" />
              </button>
            </div>
          </div>

          {cameras.length > 1 && (
            <div className="px-4 py-2 border-b dark:border-gray-700 bg-gray-50/50 dark:bg-slate-900/50">
              <select value={activeCamId} onChange={(e) => setActiveCamId(e.target.value)}
                className="w-full text-xs px-2 py-1.5 border rounded-lg dark:bg-slate-700 dark:border-gray-600 dark:text-gray-100">
                {cameras.map((c) => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
            </div>
          )}

          <div className="p-3">
            {error ? (
              <div className="text-center py-6">
                <Camera size={40} className="text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-red-500 mb-2">{error}</p>
                <p className="text-xs text-gray-400">Verifica permisos de cámara en el navegador</p>
                <button onClick={handleClose} className="mt-3 px-4 py-2 bg-gray-100 dark:bg-slate-700 rounded-lg text-sm dark:text-gray-100">
                  Cerrar
                </button>
              </div>
            ) : (
              <>
                <div className="relative rounded-lg overflow-hidden bg-black aspect-[4/3]">
                  <video ref={videoRef} className="w-full h-full object-cover" playsInline muted autoPlay />
                  {/* Overlay guía visual */}
                  <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute inset-x-[10%] top-1/2 -translate-y-1/2 h-[35%] border-2 border-red-500/80 rounded-lg shadow-[0_0_0_9999px_rgba(0,0,0,0.4)]">
                      <div className="absolute inset-x-0 top-1/2 h-px bg-red-500 animate-pulse" />
                    </div>
                  </div>
                  {detected && (
                    <div className="absolute bottom-2 left-2 right-2 bg-green-500 text-white text-xs font-mono px-2 py-1 rounded text-center">
                      ✓ {detected}
                    </div>
                  )}
                </div>
                <p className="text-[11px] text-gray-500 text-center mt-2 leading-relaxed">
                  Centra el código dentro del recuadro. Mantén a 10–25 cm de distancia con buena iluminación.
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </Portal>
  );
}

interface BarcodeFieldProps {
  value: string;
  onChange: (v: string) => void;
  className?: string;
}

export function BarcodeField({ value, onChange, className = '' }: BarcodeFieldProps) {
  const [scanning, setScanning] = useState(false);

  return (
    <div>
      <div className="flex gap-2 items-stretch">
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Ej: 7701234567890"
          className={`flex-1 min-w-0 ${className}`}
        />
        <button
          type="button"
          onClick={() => setScanning(true)}
          className="px-3 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors flex items-center justify-center flex-shrink-0"
          title="Escanear con cámara"
        >
          <Camera size={18} weight="duotone" className="text-gray-600" />
        </button>
      </div>
      {scanning && (
        <BarcodeScanner
          onScan={(code) => { onChange(code); setScanning(false); }}
          onClose={() => setScanning(false)}
        />
      )}
    </div>
  );
}
