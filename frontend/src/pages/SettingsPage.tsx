import { useState, useEffect } from 'react';
import client from '../api/client';
import toast from 'react-hot-toast';
import { useScale } from '../contexts/ScaleContext';
import { useConfig } from '../contexts/ConfigContext';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import { GearSix, ArrowUp, ArrowDown, FloppyDisk, Users, User, ImageSquare, Upload, Bell, Calendar, X, PaintBucket, Check } from '@phosphor-icons/react';
import { ACCENT_PRESETS, applyAccent, DEFAULT_ACCENT_ID } from '../utils/accentPresets';
import type { WeightUnit } from '../contexts/ScaleContext';
import { Input, Button } from '../components/ui';
import { PageHeader } from '../components/layout/PageHeader';
import { Portal } from '../components/Portal';
import { useModalEscape } from '../contexts/ModalStackContext';

interface Port {
  path: string;
  manufacturer: string;
  vendorId: string;
  productId: string;
}

export function SettingsPage() {
  const {
    connected, weight, rawWeight, stable, unit, tareActive, tareOffset,
    processorConfig, inputUnit, tare, clearTare, setUnit, setInputUnit,
    updateProcessorConfig, resetProcessor, disabled, enableScale, disableScale, status,
  } = useScale();
  const { reload: reloadConfig } = useConfig();
  const [ports, setPorts] = useState<Port[]>([]);
  const [config, setConfig] = useState<Record<string, string>>({});
  const [scalePort, setScalePort] = useState('');
  const [scaleBaud, setScaleBaud] = useState('9600');
  const [tab, setTabState] = useState<'scale' | 'processor' | 'business' | 'menu'>(() => {
    const saved = localStorage.getItem('fameat-settings-tab');
    return (['scale', 'processor', 'business', 'menu'].includes(saved || '') ? saved : 'scale') as any;
  });
  const setTab = (t: typeof tab) => { setTabState(t); localStorage.setItem('fameat-settings-tab', t); };
  const { user } = useAuth();
  const { pushEnabled, bellEnabled, togglePush, toggleBell } = useNotifications();
  const [logoLightbox, setLogoLightbox] = useState(false);

  // Procesador local (para editar antes de aplicar)
  const [procForm, setProcForm] = useState({
    minWeight: '0.002',
    stabilityCount: '3',
    stabilityTolerance: '0.002',
    averageSamples: '3',
  });

  useModalEscape(logoLightbox ? () => setLogoLightbox(false) : null);

  useEffect(() => {
    client.get('/config').then((r) => {
      setConfig(r.data);
      setScalePort(r.data.scale_port || 'COM3');
      setScaleBaud(r.data.scale_baud_rate || '9600');
    });
    loadPorts();
  }, []);

  // Sincronizar form del procesador con config real
  useEffect(() => {
    if (processorConfig) {
      setProcForm({
        minWeight: String(processorConfig.minWeight),
        stabilityCount: String(processorConfig.stabilityCount),
        stabilityTolerance: String(processorConfig.stabilityTolerance),
        averageSamples: String(processorConfig.averageSamples),
      });
    }
  }, [processorConfig]);

  const loadPorts = async () => {
    try {
      const { data } = await client.get('/scale/ports');
      setPorts(data);
    } catch { /* sin permisos */ }
  };

  const connectScale = async () => {
    try {
      await client.post('/scale/connect', { port: scalePort, baudRate: parseInt(scaleBaud) });
      toast.success('Balanza conectada');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Error al conectar');
    }
  };

  const disconnectScale = async () => {
    try {
      await client.post('/scale/disconnect');
      toast.success('Balanza desconectada');
    } catch {
      toast.error('Error al desconectar');
    }
  };

  const saveConfig = async (key: string, value: string) => {
    try {
      await client.put('/config', { [key]: value });
    } catch {
      toast.error('Error al guardar');
    }
  };

  const applyProcessorConfig = () => {
    updateProcessorConfig({
      minWeight: parseFloat(procForm.minWeight),
      stabilityCount: parseInt(procForm.stabilityCount),
      stabilityTolerance: parseFloat(procForm.stabilityTolerance),
      averageSamples: parseInt(procForm.averageSamples),
    });
    toast.success('Procesador actualizado');
  };

  const weightDisplay = unit === 'g' ? weight.toFixed(0) : weight.toFixed(3);

  return (
    <div className="flex flex-col h-full p-3 md:p-6">
      <PageHeader
        icon={<GearSix size={24} weight="duotone" />}
        title="Configuración"
        description="Centro de control del sistema: ajusta la balanza serial (puerto, baud, sensibilidad), datos del negocio (logo, dirección, teléfono), reordena el menú lateral a tu gusto y administra preferencias por usuario que se sincronizan en la nube."
      />

      <div id="settings-tabs" className="flex flex-wrap gap-2 mb-4">
        {(['scale', 'processor', 'business', 'menu'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`px-3 md:px-4 py-2 rounded-lg text-xs md:text-sm font-medium ${tab === t ? 'bg-red-500 text-white' : 'bg-gray-200'}`}>
            {t === 'scale' ? 'Balanza' : t === 'processor' ? 'Procesamiento' : t === 'business' ? 'Negocio' : 'Menú'}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-auto styled-scroll">
      {tab === 'scale' && (
        <div id="settings-content" className="space-y-6">
          {/* Toggle habilitar/deshabilitar balanza */}
          <div className="bg-white rounded-xl shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-bold">Balanza habilitada</h2>
                <p className="text-sm text-gray-500">
                  {disabled
                    ? 'La balanza esta deshabilitada. No se intentara conectar automaticamente.'
                    : 'La balanza intentara conectarse al iniciar el sistema.'}
                </p>
              </div>
              <button
                onClick={() => {
                  if (disabled) {
                    enableScale();
                    toast.success('Balanza habilitada. Reconectando...');
                  } else {
                    disableScale();
                    toast.success('Balanza deshabilitada');
                  }
                }}
                className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${disabled ? 'bg-gray-300' : 'bg-green-500'}`}
              >
                <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${disabled ? 'translate-x-1' : 'translate-x-6'}`} />
              </button>
            </div>
          </div>

          {/* Estado actual */}
          <div className="bg-white rounded-xl shadow p-4">
            <h2 className="font-bold mb-3">Estado de la Balanza</h2>
            <div className="flex items-center gap-3 mb-2">
              <span className={`w-3 h-3 rounded-full ${connected ? 'bg-green-500' : disabled ? 'bg-yellow-500' : 'bg-red-500'}`} />
              <span className="font-medium">{connected ? 'Conectada' : disabled ? 'Deshabilitada por usuario' : status === 'connecting' ? 'Conectando...' : 'Desconectada'}</span>
            </div>
            {connected && (
              <div>
                <div className="text-2xl font-mono font-bold">
                  {weightDisplay} {unit}
                  <span className={`ml-2 text-sm ${stable ? 'text-green-600' : 'text-yellow-600'}`}>
                    {stable ? 'ESTABLE' : 'INESTABLE'}
                  </span>
                </div>
                <div className="text-sm text-gray-500 mt-1">
                  Raw: {rawWeight.toFixed(3)} kg
                  {tareActive && <span className="ml-3 text-purple-600">TARE: {tareOffset.toFixed(3)} kg</span>}
                </div>
              </div>
            )}
          </div>

          {/* Controles rápidos */}
          <div className="bg-white rounded-xl shadow p-4">
            <h2 className="font-bold mb-3">Controles Rápidos</h2>
            <div className="flex flex-col sm:flex-row gap-4 items-start flex-wrap">
              {/* Unidad de entrada (botón físico de la balanza) */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Balanza envía en
                  <span className="text-gray-400 font-normal ml-1">(botón físico)</span>
                </label>
                <div className="flex gap-1">
                  {(['kg', 'lb'] as WeightUnit[]).map((u) => (
                    <button key={u} onClick={() => setInputUnit(u)}
                      className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
                        inputUnit === u ? 'bg-orange-600 text-white' : 'bg-gray-100 hover:bg-gray-200'
                      }`}>
                      {u.toUpperCase()}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Cambia esto cuando presiones kg/lb en la balanza física
                </p>
              </div>
              {/* Unidad de visualización */}
              <div>
                <label className="block text-sm font-medium mb-2">Mostrar en</label>
                <div className="flex gap-1">
                  {(['kg', 'lb', 'g'] as WeightUnit[]).map((u) => (
                    <button key={u} onClick={() => setUnit(u)}
                      className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
                        unit === u ? 'bg-blue-600 text-white' : 'bg-gray-100 hover:bg-gray-200'
                      }`}>
                      {u.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
              {/* Tare */}
              <div>
                <label className="block text-sm font-medium mb-2">Tare (Poner en cero)</label>
                <div className="flex gap-1">
                  <button onClick={tare} disabled={!connected}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-40 text-sm font-medium">
                    TARAR
                  </button>
                  <button onClick={clearTare} disabled={!tareActive}
                    className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 disabled:opacity-40 text-sm">
                    Quitar Tare
                  </button>
                  <button onClick={resetProcessor}
                    className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 text-sm">
                    Reset Todo
                  </button>
                </div>
                {tareActive && (
                  <p className="text-xs text-purple-600 mt-1">
                    Tare activo: restando {tareOffset.toFixed(3)} kg de cada lectura
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Conexión serial */}
          <div className="bg-white rounded-xl shadow p-4">
            <h2 className="font-bold mb-3">Conexión Serial</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium mb-1">Puerto COM</label>
                <select value={scalePort} onChange={(e) => setScalePort(e.target.value)} className="w-full px-3 py-2 border rounded-lg">
                  {ports.map((p) => (
                    <option key={p.path} value={p.path}>
                      {p.path} {p.manufacturer ? `(${p.manufacturer})` : ''}
                    </option>
                  ))}
                  {ports.length === 0 && <option value={scalePort}>{scalePort}</option>}
                </select>
                <button onClick={loadPorts} className="text-xs text-blue-600 hover:underline mt-1">
                  Refrescar puertos
                </button>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Baud Rate</label>
                <select value={scaleBaud} onChange={(e) => setScaleBaud(e.target.value)} className="w-full px-3 py-2 border rounded-lg">
                  {[2400, 4800, 9600, 19200, 38400, 115200].map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={connectScale} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm">Conectar</button>
              <button onClick={disconnectScale} className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm">Desconectar</button>
              <button onClick={() => { saveConfig('scale_port', scalePort); saveConfig('scale_baud_rate', scaleBaud); toast.success('Config guardada'); }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">Guardar Config</button>
            </div>
          </div>

          {/* Puertos detectados */}
          <div className="bg-white rounded-xl shadow p-4">
            <h2 className="font-bold mb-3">Puertos Detectados</h2>
            {ports.length === 0 ? (
              <p className="text-gray-400">No se detectaron puertos COM</p>
            ) : (
              <div className="space-y-2">
                {ports.map((p) => (
                  <div key={p.path} className="flex items-center justify-between bg-gray-50 p-2 rounded-lg">
                    <div>
                      <span className="font-mono font-medium">{p.path}</span>
                      {p.manufacturer && <span className="text-sm text-gray-500 ml-2">{p.manufacturer}</span>}
                    </div>
                    <div className="text-xs text-gray-400">VID: {p.vendorId || '-'} PID: {p.productId || '-'}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'processor' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow p-4">
            <h2 className="font-bold mb-1">Procesamiento por Software</h2>
            <p className="text-sm text-gray-500 mb-4">
              Estos filtros se aplican en el software sobre los datos crudos de la balanza.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Peso mínimo (kg)
                  <span className="text-gray-400 font-normal ml-1">filtro de ruido</span>
                </label>
                <input type="number" step="0.001" value={procForm.minWeight}
                  onChange={(e) => setProcForm({ ...procForm, minWeight: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg" />
                <p className="text-xs text-gray-400 mt-1">
                  Lecturas menores a este valor se consideran 0. Default: 0.002 (2g)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Lecturas para estabilidad
                  <span className="text-gray-400 font-normal ml-1">filtro estable</span>
                </label>
                <input type="number" min="1" max="20" value={procForm.stabilityCount}
                  onChange={(e) => setProcForm({ ...procForm, stabilityCount: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg" />
                <p className="text-xs text-gray-400 mt-1">
                  Cuántas lecturas consecutivas iguales = "ESTABLE". Default: 3
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Tolerancia estabilidad (kg)
                  <span className="text-gray-400 font-normal ml-1">margen</span>
                </label>
                <input type="number" step="0.001" value={procForm.stabilityTolerance}
                  onChange={(e) => setProcForm({ ...procForm, stabilityTolerance: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg" />
                <p className="text-xs text-gray-400 mt-1">
                  Rango aceptable de variación entre lecturas. Default: 0.002 (2g)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Muestras para promedio
                  <span className="text-gray-400 font-normal ml-1">suavizado</span>
                </label>
                <input type="number" min="1" max="20" value={procForm.averageSamples}
                  onChange={(e) => setProcForm({ ...procForm, averageSamples: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg" />
                <p className="text-xs text-gray-400 mt-1">
                  Promedia las últimas N lecturas para suavizar. 1 = sin promedio. Default: 3
                </p>
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button onClick={applyProcessorConfig}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 font-medium">
                Aplicar Cambios
              </button>
              <button onClick={() => { updateProcessorConfig({ minWeight: 0.002, stabilityCount: 3, stabilityTolerance: 0.002, averageSamples: 3 }); toast.success('Valores restaurados'); }}
                className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300">
                Restaurar Defaults
              </button>
            </div>
          </div>

          {/* Preview en vivo */}
          {connected && (
            <div className="bg-white rounded-xl shadow p-4">
              <h2 className="font-bold mb-3">Vista en Vivo</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4 text-center">
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-sm text-gray-500">Raw (balanza)</div>
                  <div className="text-2xl font-mono font-bold">{rawWeight.toFixed(3)} kg</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-sm text-gray-500">Procesado</div>
                  <div className="text-2xl font-mono font-bold text-blue-600">{weightDisplay} {unit}</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-sm text-gray-500">Estado</div>
                  <div className={`text-2xl font-bold ${stable ? 'text-green-600' : 'text-yellow-600'}`}>
                    {stable ? 'ESTABLE' : 'INESTABLE'}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'business' && (
        <div className="space-y-4">
          {/* Logo */}
          <div className="bg-white rounded-xl shadow p-4">
            <h2 className="font-bold mb-3">Logo del negocio</h2>
            <p className="text-xs text-gray-500 mb-3">Se usara en la interfaz, sidebar, login y como icono de la PWA instalada.</p>
            <div className="flex items-center gap-4">
              <button type="button" onClick={() => config.business_logo && setLogoLightbox(true)}
                className={`w-20 h-20 rounded-xl bg-gray-100 flex items-center justify-center overflow-hidden border-2 border-dashed border-gray-300 transition-all ${config.business_logo ? 'cursor-zoom-in hover:border-red-400 hover:shadow-md' : ''}`}
                title={config.business_logo ? 'Click para ampliar' : ''}>
                {config.business_logo ? (
                  <img src={config.business_logo} alt="Logo" className="w-full h-full object-cover" />
                ) : (
                  <ImageSquare size={28} className="text-gray-300" />
                )}
              </button>
              <div className="flex-1">
                <input type="file" id="logo-upload" accept="image/*" className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const formData = new FormData();
                    formData.append('logo', file);
                    try {
                      const { data } = await client.post('/config/logo', formData, {
                        headers: { 'Content-Type': 'multipart/form-data' },
                      });
                      setConfig({ ...config, business_logo: data.logoUrl });
                      reloadConfig();
                      toast.success('Logo actualizado');
                    } catch {
                      toast.error('Error al subir logo');
                    }
                  }} />
                <button onClick={() => document.getElementById('logo-upload')?.click()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 text-sm font-medium transition-colors">
                  <Upload size={16} weight="duotone" /> Subir logo
                </button>
                <p className="text-[10px] text-gray-400 mt-1">PNG o JPG, max 5MB. Recomendado: 512x512px</p>
              </div>
            </div>
          </div>

          {/* Notificaciones */}
          <div className="bg-white rounded-xl shadow p-4 space-y-4">
            <h2 className="font-bold">Notificaciones</h2>

            {/* Campana */}
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                  <Bell size={18} weight="duotone" />
                </div>
                <div>
                  <p className="text-sm font-medium">Campana in-app</p>
                  <p className="text-[11px] text-gray-400">Notificaciones dentro de la aplicacion</p>
                </div>
              </div>
              <button onClick={toggleBell}
                className={`relative w-11 h-6 rounded-full transition-colors ${bellEnabled ? 'bg-green-500' : 'bg-gray-300'}`}>
                <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${bellEnabled ? 'left-5' : 'left-0.5'}`} />
              </button>
            </div>

            {/* Push SO */}
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center">
                  <Bell size={18} weight="fill" />
                </div>
                <div>
                  <p className="text-sm font-medium">Push del sistema</p>
                  <p className="text-[11px] text-gray-400">Notificaciones nativas de Windows/Android</p>
                </div>
              </div>
              <button onClick={togglePush}
                className={`relative w-11 h-6 rounded-full transition-colors ${pushEnabled ? 'bg-green-500' : 'bg-gray-300'}`}>
                <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${pushEnabled ? 'left-5' : 'left-0.5'}`} />
              </button>
            </div>
          </div>

          {/* Datos */}
          <div className="bg-white rounded-xl shadow p-4 space-y-4">
            <h2 className="font-bold mb-3">Datos del Negocio</h2>
            <Input
              label="Nombre del negocio"
              value={config.business_name || ''}
              onChange={(e) => setConfig({ ...config, business_name: e.target.value })}
            />
            <Input
              label="Dirección"
              value={config.business_address || ''}
              onChange={(e) => setConfig({ ...config, business_address: e.target.value })}
            />
            <Input
              label="Teléfono"
              value={config.business_phone || ''}
              onChange={(e) => setConfig({ ...config, business_phone: e.target.value })}
            />
            <Button variant="primary" iconLeft={<FloppyDisk size={16} weight="duotone" />}
              onClick={() => {
                saveConfig('business_name', config.business_name || '');
                saveConfig('business_address', config.business_address || '');
                saveConfig('business_phone', config.business_phone || '');
                reloadConfig();
                toast.success('Datos guardados');
              }}>
              Guardar
            </Button>
          </div>

          {/* Color de acento */}
          <div className="bg-white rounded-xl shadow p-4 space-y-4">
            <div>
              <h2 className="font-bold flex items-center gap-2 mb-1">
                <PaintBucket size={18} weight="duotone" className="text-red-500" />
                Color de Acento
              </h2>
              <p className="text-xs text-gray-500">
                Color principal de la aplicación (botones, badges, encabezados). Todos los presets están
                optimizados para buen contraste y accesibilidad WCAG AA.
              </p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {ACCENT_PRESETS.map((preset) => {
                const current = (config.accent_color || DEFAULT_ACCENT_ID) === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => {
                      setConfig({ ...config, accent_color: preset.id });
                      applyAccent(preset.id);
                    }}
                    className={`relative text-left rounded-xl border-2 p-3 transition-all hover:shadow-md ${current ? 'border-red-500 ring-2 ring-red-200 dark:ring-red-900/50' : 'border-gray-200 dark:border-gray-700 hover:border-gray-400'}`}
                    title={preset.description}
                  >
                    {current && (
                      <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center">
                        <Check size={12} weight="bold" />
                      </div>
                    )}
                    <div className="flex items-center gap-2 mb-2">
                      <span className="inline-block w-8 h-8 rounded-lg shadow-inner" style={{ background: preset.swatch }} />
                      <div className="flex flex-col gap-1">
                        {Object.entries(preset.shades).slice(2, 8).map(([k, v]) => (
                          <span key={k} className="inline-block w-3 h-1.5 rounded-full" style={{ background: v }} />
                        ))}
                      </div>
                    </div>
                    <p className="text-xs font-bold leading-tight">{preset.label}</p>
                    <p className="text-[10px] text-gray-500 leading-tight mt-0.5 line-clamp-2">{preset.description}</p>
                  </button>
                );
              })}
            </div>
            <Button variant="primary" iconLeft={<FloppyDisk size={16} weight="duotone" />}
              onClick={async () => {
                const accentId = config.accent_color || DEFAULT_ACCENT_ID;
                await saveConfig('accent_color', accentId);
                applyAccent(accentId);
                reloadConfig();
                toast.success('Color de acento guardado');
              }}>
              Guardar color
            </Button>
          </div>

          {/* Vencimientos */}
          <div className="bg-white rounded-xl shadow p-4 space-y-4">
            <h2 className="font-bold flex items-center gap-2">
              <Calendar size={18} weight="duotone" className="text-amber-600" />
              Alertas de vencimiento
            </h2>
            <p className="text-xs text-gray-500">
              Días antes del vencimiento de un lote en que el sistema generará notificaciones automáticas.
            </p>
            <Input
              label="Días antes para alertar"
              type="number"
              min="1"
              max="90"
              value={config.expiry_alert_days_before || '7'}
              onChange={(e) => setConfig({ ...config, expiry_alert_days_before: e.target.value })}
              suffix="días"
              hint="Recomendado: 7-14 días"
            />
            <Button variant="primary" iconLeft={<FloppyDisk size={16} weight="duotone" />}
              onClick={() => {
                const val = config.expiry_alert_days_before || '7';
                saveConfig('expiry_alert_days_before', val);
                toast.success(`Alertas configuradas a ${val} días`);
              }}>
              Guardar
            </Button>
          </div>
        </div>
      )}

      {/* Logo Lightbox */}
      {logoLightbox && config.business_logo && (
        <Portal>
          <div className="fixed inset-0 z-[99999] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setLogoLightbox(false)}>
            <div className="relative max-w-2xl w-full" onClick={(e) => e.stopPropagation()}>
              <button onClick={() => setLogoLightbox(false)}
                className="absolute -top-3 -right-3 w-9 h-9 bg-white rounded-full shadow-lg flex items-center justify-center text-gray-600 hover:text-gray-900 z-10">
                <X size={18} weight="bold" />
              </button>
              <img src={config.business_logo} alt="Logo" className="w-full rounded-xl shadow-2xl object-contain max-h-[80vh] bg-white p-6" />
              <p className="text-white/80 text-center text-xs mt-3">Logo del negocio · click fuera para cerrar</p>
            </div>
          </div>
        </Portal>
      )}

      {tab === 'menu' && <MenuOrderSettings userId={user?.id} />}
      </div>
    </div>
  );
}

const ALL_MENU_ITEMS = [
  { key: '/', label: 'Punto de Venta' },
  { key: '/dashboard', label: 'Dashboard' },
  { key: '/products', label: 'Productos' },
  { key: '/categories', label: 'Categorías' },
  { key: '/inventory', label: 'Inventario' },
  { key: '/sales', label: 'Historial Ventas' },
  { key: '/cash', label: 'Caja' },
  { key: '/customers', label: 'Clientes' },
  { key: '/suppliers', label: 'Proveedores' },
  { key: '/purchase-orders', label: 'Órdenes Compra' },
  { key: '/expenses', label: 'Gastos' },
  { key: '/reports', label: 'Reportes' },
  { key: '/notifications', label: 'Notificaciones' },
  { key: '/backups', label: 'Backups' },
  { key: '/settings', label: 'Configuración' },
];

const MENU_ORDER_KEY = 'menu_order'; // key en /api/preferences (DB por usuario)
const MENU_ORDER_GLOBAL_KEY = 'menu_order'; // key en /api/config (global todos)

function MenuOrderSettings({ userId: _userId }: { userId?: number }) {
  const [items, setItems] = useState(ALL_MENU_ITEMS);
  const [scope, setScope] = useState<'personal' | 'global'>('personal');

  function sortByOrder(order: string[]) {
    const sorted = [...ALL_MENU_ITEMS].sort((a, b) => {
      const ia = order.indexOf(a.key);
      const ib = order.indexOf(b.key);
      return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
    });
    return sorted;
  }

  useEffect(() => {
    // Cargar orden guardado desde DB
    if (scope === 'personal') {
      import('../api/preferences').then((prefs) => {
        prefs.getOne<string[]>(MENU_ORDER_KEY).then((order) => {
          if (Array.isArray(order) && order.length > 0) setItems(sortByOrder(order));
          else setItems(ALL_MENU_ITEMS);
        }).catch(() => setItems(ALL_MENU_ITEMS));
      });
    } else {
      client.get('/config').then((r) => {
        const order = r.data[MENU_ORDER_GLOBAL_KEY];
        if (order) {
          try {
            setItems(sortByOrder(JSON.parse(order)));
          } catch {}
        } else {
          setItems(ALL_MENU_ITEMS);
        }
      }).catch(() => {});
    }
  }, [scope]);

  function move(index: number, dir: -1 | 1) {
    const next = index + dir;
    if (next < 0 || next >= items.length) return;
    const copy = [...items];
    [copy[index], copy[next]] = [copy[next], copy[index]];
    setItems(copy);
  }

  async function save() {
    const order = items.map((i) => i.key);
    if (scope === 'personal') {
      const prefs = await import('../api/preferences');
      await prefs.setOne(MENU_ORDER_KEY, order);
      window.dispatchEvent(new CustomEvent('menu-order-changed', { detail: order }));
      toast.success('Orden del menú guardado (personal)');
    } else {
      await client.put('/config', { [MENU_ORDER_GLOBAL_KEY]: JSON.stringify(order) });
      window.dispatchEvent(new CustomEvent('menu-order-changed', { detail: order }));
      toast.success('Orden del menú guardado (todos los usuarios)');
    }
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl shadow p-4">
        <h2 className="font-bold mb-3">Orden del menú</h2>
        <p className="text-sm text-gray-500 mb-4">Arrastra o usa las flechas para cambiar el orden de las opciones del menú lateral.</p>

        {/* Scope selector */}
        <div className="flex gap-2 mb-4">
          <button onClick={() => setScope('personal')}
            className={`flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-colors ${scope === 'personal' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            <User size={16} weight="duotone" /> Solo para mí
          </button>
          <button onClick={() => setScope('global')}
            className={`flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-colors ${scope === 'global' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            <Users size={16} weight="duotone" /> Para todos
          </button>
        </div>

        {/* Items list - drag and drop */}
        <p className="text-xs text-gray-500 mb-2">Arrastra para reordenar.</p>
        <div className="space-y-1">
          {items.map((item, i) => (
            <div
              key={item.key}
              draggable
              onDragStart={(e) => { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', String(i)); }}
              onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
              onDrop={(e) => {
                e.preventDefault();
                const from = Number(e.dataTransfer.getData('text/plain'));
                if (from === i || Number.isNaN(from)) return;
                const copy = [...items];
                const [moved] = copy.splice(from, 1);
                copy.splice(i, 0, moved);
                setItems(copy);
              }}
              className="flex items-center gap-2 bg-gray-50 dark:bg-slate-700/40 rounded-lg px-3 py-2.5 cursor-grab active:cursor-grabbing hover:bg-gray-100 dark:hover:bg-slate-700 border border-transparent hover:border-gray-200 dark:hover:border-gray-600 transition-all"
              title="Arrastra para mover"
            >
              <span className="text-gray-400 select-none">⠿</span>
              <span className="text-xs text-gray-400 w-5 text-center font-bold">{i + 1}</span>
              <span className="flex-1 text-sm font-medium">{item.label}</span>
              <button type="button" onClick={() => move(i, -1)} disabled={i === 0}
                className="p-1 rounded-lg hover:bg-gray-200 disabled:opacity-20 transition-colors md:hidden">
                <ArrowUp size={14} weight="bold" />
              </button>
              <button type="button" onClick={() => move(i, 1)} disabled={i === items.length - 1}
                className="p-1 rounded-lg hover:bg-gray-200 disabled:opacity-20 transition-colors md:hidden">
                <ArrowDown size={14} weight="bold" />
              </button>
            </div>
          ))}
        </div>

        <button onClick={save}
          className="mt-4 w-full inline-flex items-center justify-center gap-1.5 py-2.5 bg-red-500 text-white rounded-lg hover:bg-red-600 text-sm font-medium transition-colors">
          <FloppyDisk size={16} weight="duotone" /> Guardar orden
        </button>
      </div>
    </div>
  );
}
