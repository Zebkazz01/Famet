import { createContext, useContext, useState, useEffect, useRef, ReactNode, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

export type WeightUnit = 'kg' | 'lb' | 'g';

interface ProcessedReading {
  rawWeight: number;
  weight: number;
  unit: WeightUnit;
  stable: boolean;
  tareActive: boolean;
  tareOffset: number;
  raw: string;
}

export interface ProcessorConfig {
  inputUnit: WeightUnit;
  unit: WeightUnit;
  minWeight: number;
  stabilityCount: number;
  stabilityTolerance: number;
  averageSamples: number;
}

export type ScaleStatus = 'connecting' | 'connected' | 'disconnected' | 'disabled';

interface ScaleContextType {
  weight: number;
  rawWeight: number;
  unit: WeightUnit;
  stable: boolean;
  connected: boolean;
  tareActive: boolean;
  tareOffset: number;
  processorConfig: ProcessorConfig | null;
  inputUnit: WeightUnit;
  /** Estado general de la balanza */
  status: ScaleStatus;
  /** Balanza deshabilitada por el usuario */
  disabled: boolean;
  captureWeight: () => number;
  tare: () => void;
  clearTare: () => void;
  setUnit: (unit: WeightUnit) => void;
  setInputUnit: (unit: WeightUnit) => void;
  updateProcessorConfig: (config: Partial<ProcessorConfig>) => void;
  resetProcessor: () => void;
  /** Deshabilitar balanza (trabajar sin ella) */
  disableScale: () => void;
  /** Re-habilitar y reconectar balanza */
  enableScale: () => void;
}

const ScaleContext = createContext<ScaleContextType>({
  weight: 0,
  rawWeight: 0,
  unit: 'kg',
  stable: false,
  connected: false,
  tareActive: false,
  tareOffset: 0,
  processorConfig: null,
  inputUnit: 'kg',
  status: 'connecting',
  disabled: false,
  captureWeight: () => 0,
  tare: () => {},
  clearTare: () => {},
  setUnit: () => {},
  setInputUnit: () => {},
  updateProcessorConfig: () => {},
  resetProcessor: () => {},
  disableScale: () => {},
  enableScale: () => {},
});

export function ScaleProvider({ children }: { children: ReactNode }) {
  const [weight, setWeight] = useState(0);
  const [rawWeight, setRawWeight] = useState(0);
  const [unit, setUnitState] = useState<WeightUnit>('kg');
  const [stable, setStable] = useState(false);
  const [connected, setConnected] = useState(false);
  const [tareActive, setTareActive] = useState(false);
  const [tareOffset, setTareOffset] = useState(0);
  const [processorConfig, setProcessorConfig] = useState<ProcessorConfig | null>(null);
  const [inputUnit, setInputUnitState] = useState<WeightUnit>('kg');
  const [status, setStatus] = useState<ScaleStatus>('connecting');
  const [disabled, setDisabled] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  const connectSocket = useCallback(() => {
    // Limpiar socket anterior si existe
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    setStatus('connecting');
    setConnected(false);

    const socket: Socket = io('/scale', {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
      timeout: 8000,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      // Socket conectado al servidor, esperamos status de la balanza física
    });

    socket.on('processedWeight', (reading: ProcessedReading) => {
      setWeight(reading.weight);
      setRawWeight(reading.rawWeight);
      setUnitState(reading.unit);
      setStable(reading.stable);
      setTareActive(reading.tareActive);
      setTareOffset(reading.tareOffset);
    });

    socket.on('status', (s: { connected: boolean }) => {
      setConnected(s.connected);
      if (s.connected) {
        setStatus('connected');
      } else {
        setStatus('disconnected');
        setWeight(0);
        setRawWeight(0);
        setStable(false);
      }
    });

    socket.on('tare', (data: { active: boolean; offset: number }) => {
      setTareActive(data.active);
      setTareOffset(data.offset);
    });

    socket.on('processorConfig', (config: ProcessorConfig) => {
      setProcessorConfig(config);
      setUnitState(config.unit);
      setInputUnitState(config.inputUnit);
    });

    socket.on('disconnect', () => {
      setConnected(false);
      setStatus('disconnected');
    });

    socket.on('connect_error', () => {
      setStatus('disconnected');
    });
  }, []);

  // Conectar al montar (si no está deshabilitada)
  useEffect(() => {
    if (!disabled) {
      connectSocket();
    }
    return () => {
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const captureWeight = useCallback(() => weight, [weight]);

  const tare = useCallback(() => {
    socketRef.current?.emit('tare');
  }, []);

  const clearTare = useCallback(() => {
    socketRef.current?.emit('clearTare');
  }, []);

  const setUnit = useCallback((u: WeightUnit) => {
    socketRef.current?.emit('setUnit', u);
  }, []);

  const setInputUnit = useCallback((u: WeightUnit) => {
    socketRef.current?.emit('setInputUnit', u);
  }, []);

  const updateProcessorConfig = useCallback((config: Partial<ProcessorConfig>) => {
    socketRef.current?.emit('updateProcessorConfig', config);
  }, []);

  const resetProcessor = useCallback(() => {
    socketRef.current?.emit('resetProcessor');
  }, []);

  const disableScale = useCallback(() => {
    socketRef.current?.disconnect();
    socketRef.current = null;
    setDisabled(true);
    setStatus('disabled');
    setConnected(false);
    setWeight(0);
    setRawWeight(0);
    setStable(false);
  }, []);

  const enableScale = useCallback(() => {
    setDisabled(false);
    connectSocket();
  }, [connectSocket]);

  return (
    <ScaleContext.Provider value={{
      weight, rawWeight, unit, stable, connected,
      tareActive, tareOffset, processorConfig, inputUnit,
      status, disabled,
      captureWeight, tare, clearTare, setUnit, setInputUnit,
      updateProcessorConfig, resetProcessor,
      disableScale, enableScale,
    }}>
      {children}
    </ScaleContext.Provider>
  );
}

export function useScale() {
  return useContext(ScaleContext);
}
