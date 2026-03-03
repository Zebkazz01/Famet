import { useState, useEffect } from 'react';
import client from '../api/client';
import toast from 'react-hot-toast';
import { useScale } from '../contexts/ScaleContext';
import type { WeightUnit } from '../contexts/ScaleContext';

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
  const [ports, setPorts] = useState<Port[]>([]);
  const [config, setConfig] = useState<Record<string, string>>({});
  const [scalePort, setScalePort] = useState('');
  const [scaleBaud, setScaleBaud] = useState('9600');
  const [tab, setTab] = useState<'scale' | 'processor' | 'business'>('scale');

  // Procesador local (para editar antes de aplicar)
  const [procForm, setProcForm] = useState({
    minWeight: '0.002',
    stabilityCount: '3',
    stabilityTolerance: '0.002',
    averageSamples: '3',
  });

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
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Configuración</h1>

      <div className="flex gap-2 mb-4">
        {(['scale', 'processor', 'business'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 rounded-md text-sm font-medium ${tab === t ? 'bg-red-600 text-white' : 'bg-gray-200'}`}>
            {t === 'scale' ? 'Balanza' : t === 'processor' ? 'Procesamiento' : 'Negocio'}
          </button>
        ))}
      </div>

      {tab === 'scale' && (
        <div className="space-y-6">
          {/* Toggle habilitar/deshabilitar balanza */}
          <div className="bg-white rounded-lg shadow p-4">
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
          <div className="bg-white rounded-lg shadow p-4">
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
          <div className="bg-white rounded-lg shadow p-4">
            <h2 className="font-bold mb-3">Controles Rápidos</h2>
            <div className="flex gap-4 items-start flex-wrap">
              {/* Unidad de entrada (botón físico de la balanza) */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Balanza envía en
                  <span className="text-gray-400 font-normal ml-1">(botón físico)</span>
                </label>
                <div className="flex gap-1">
                  {(['kg', 'lb'] as WeightUnit[]).map((u) => (
                    <button key={u} onClick={() => setInputUnit(u)}
                      className={`px-4 py-2 rounded-md text-sm font-bold transition-colors ${
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
                      className={`px-4 py-2 rounded-md text-sm font-bold transition-colors ${
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
                    className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-40 text-sm font-medium">
                    TARAR
                  </button>
                  <button onClick={clearTare} disabled={!tareActive}
                    className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300 disabled:opacity-40 text-sm">
                    Quitar Tare
                  </button>
                  <button onClick={resetProcessor}
                    className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300 text-sm">
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
          <div className="bg-white rounded-lg shadow p-4">
            <h2 className="font-bold mb-3">Conexión Serial</h2>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium mb-1">Puerto COM</label>
                <select value={scalePort} onChange={(e) => setScalePort(e.target.value)} className="w-full px-3 py-2 border rounded-md">
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
                <select value={scaleBaud} onChange={(e) => setScaleBaud(e.target.value)} className="w-full px-3 py-2 border rounded-md">
                  {[2400, 4800, 9600, 19200, 38400, 115200].map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={connectScale} className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm">Conectar</button>
              <button onClick={disconnectScale} className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 text-sm">Desconectar</button>
              <button onClick={() => { saveConfig('scale_port', scalePort); saveConfig('scale_baud_rate', scaleBaud); toast.success('Config guardada'); }}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm">Guardar Config</button>
            </div>
          </div>

          {/* Puertos detectados */}
          <div className="bg-white rounded-lg shadow p-4">
            <h2 className="font-bold mb-3">Puertos Detectados</h2>
            {ports.length === 0 ? (
              <p className="text-gray-400">No se detectaron puertos COM</p>
            ) : (
              <div className="space-y-2">
                {ports.map((p) => (
                  <div key={p.path} className="flex items-center justify-between bg-gray-50 p-2 rounded">
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
          <div className="bg-white rounded-lg shadow p-4">
            <h2 className="font-bold mb-1">Procesamiento por Software</h2>
            <p className="text-sm text-gray-500 mb-4">
              Estos filtros se aplican en el software sobre los datos crudos de la balanza.
            </p>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Peso mínimo (kg)
                  <span className="text-gray-400 font-normal ml-1">filtro de ruido</span>
                </label>
                <input type="number" step="0.001" value={procForm.minWeight}
                  onChange={(e) => setProcForm({ ...procForm, minWeight: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md" />
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
                  className="w-full px-3 py-2 border rounded-md" />
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
                  className="w-full px-3 py-2 border rounded-md" />
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
                  className="w-full px-3 py-2 border rounded-md" />
                <p className="text-xs text-gray-400 mt-1">
                  Promedia las últimas N lecturas para suavizar. 1 = sin promedio. Default: 3
                </p>
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button onClick={applyProcessorConfig}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 font-medium">
                Aplicar Cambios
              </button>
              <button onClick={() => { updateProcessorConfig({ minWeight: 0.002, stabilityCount: 3, stabilityTolerance: 0.002, averageSamples: 3 }); toast.success('Valores restaurados'); }}
                className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300">
                Restaurar Defaults
              </button>
            </div>
          </div>

          {/* Preview en vivo */}
          {connected && (
            <div className="bg-white rounded-lg shadow p-4">
              <h2 className="font-bold mb-3">Vista en Vivo</h2>
              <div className="grid grid-cols-3 gap-4 text-center">
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
        <div className="bg-white rounded-lg shadow p-4 space-y-4">
          <h2 className="font-bold mb-3">Datos del Negocio</h2>
          <div>
            <label className="block text-sm font-medium mb-1">Nombre del negocio</label>
            <input value={config.business_name || ''}
              onChange={(e) => setConfig({ ...config, business_name: e.target.value })}
              className="w-full px-3 py-2 border rounded-md" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Dirección</label>
            <input value={config.business_address || ''}
              onChange={(e) => setConfig({ ...config, business_address: e.target.value })}
              className="w-full px-3 py-2 border rounded-md" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Teléfono</label>
            <input value={config.business_phone || ''}
              onChange={(e) => setConfig({ ...config, business_phone: e.target.value })}
              className="w-full px-3 py-2 border rounded-md" />
          </div>
          <button onClick={() => {
            saveConfig('business_name', config.business_name || '');
            saveConfig('business_address', config.business_address || '');
            saveConfig('business_phone', config.business_phone || '');
            toast.success('Datos guardados');
          }} className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700">
            Guardar
          </button>
        </div>
      )}
    </div>
  );
}
