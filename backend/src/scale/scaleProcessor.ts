import { EventEmitter } from "events";
import { ScaleReading } from "./scaleParser";

export type WeightUnit = "kg" | "lb" | "g";

export interface ProcessedReading {
  /** Peso crudo de la balanza en kg */
  rawWeight: number;
  /** Peso después de tare, en la unidad seleccionada */
  weight: number;
  /** Unidad de visualización */
  unit: WeightUnit;
  /** Estable según el filtro de estabilidad por software */
  stable: boolean;
  /** Tare activo (offset > 0) */
  tareActive: boolean;
  /** Valor del tare en kg */
  tareOffset: number;
  /** Dato crudo original de la balanza */
  raw: string;
}

export interface ScaleProcessorConfig {
  /** Unidad en la que la balanza ENVÍA datos (depende del botón físico kg/lb de la balanza) */
  inputUnit: WeightUnit;
  /** Unidad de visualización: kg, lb, g */
  unit: WeightUnit;
  /** Peso mínimo en kg para considerar lectura válida (filtro de ruido) */
  minWeight: number;
  /** Cantidad de lecturas consecutivas iguales para considerar "estable" */
  stabilityCount: number;
  /** Tolerancia para comparar lecturas (en kg). Lecturas dentro de este rango se consideran "iguales" */
  stabilityTolerance: number;
  /** Cantidad de lecturas para promediar (1 = sin promedio) */
  averageSamples: number;
}

const UNIT_CONVERSIONS: Record<WeightUnit, { factor: number; label: string }> = {
  kg: { factor: 1, label: "kg" },
  lb: { factor: 2.20462, label: "lb" },
  g:  { factor: 1000, label: "g" },
};

// Factores para normalizar a kg (inversos de UNIT_CONVERSIONS)
const TO_KG: Record<WeightUnit, number> = {
  kg: 1,
  lb: 1 / 2.20462,   // 0.453592
  g:  1 / 1000,       // 0.001
};

const DEFAULT_CONFIG: ScaleProcessorConfig = {
  inputUnit: "kg",        // la balanza envía en kg por defecto
  unit: "kg",
  minWeight: 0.002,       // 2 gramos mínimo
  stabilityCount: 3,      // 3 lecturas iguales = estable
  stabilityTolerance: 0.002, // ±2g de tolerancia
  averageSamples: 3,      // promedio de 3 lecturas
};

export class ScaleProcessor extends EventEmitter {
  private config: ScaleProcessorConfig;
  private tareOffset: number = 0;
  private recentReadings: number[] = [];
  private stabilityBuffer: number[] = [];

  constructor(config?: Partial<ScaleProcessorConfig>) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /** Procesa una lectura cruda de la balanza y emite lectura procesada */
  process(reading: ScaleReading): ProcessedReading | null {
    // Normalizar a kg según la unidad de entrada de la balanza
    const rawKg = reading.weight * TO_KG[this.config.inputUnit];

    // Filtro de peso mínimo (ruido)
    const effectiveWeight = Math.abs(rawKg) < this.config.minWeight ? 0 : rawKg;

    // Buffer de promedio
    this.recentReadings.push(effectiveWeight);
    if (this.recentReadings.length > this.config.averageSamples) {
      this.recentReadings.shift();
    }

    // Calcular promedio
    const averaged = this.recentReadings.length > 0
      ? this.recentReadings.reduce((a, b) => a + b, 0) / this.recentReadings.length
      : effectiveWeight;

    // Aplicar tare
    const taredKg = averaged - this.tareOffset;

    // Detección de estabilidad por software
    this.stabilityBuffer.push(averaged);
    if (this.stabilityBuffer.length > this.config.stabilityCount) {
      this.stabilityBuffer.shift();
    }

    let stable = false;
    if (this.stabilityBuffer.length >= this.config.stabilityCount) {
      const min = Math.min(...this.stabilityBuffer);
      const max = Math.max(...this.stabilityBuffer);
      stable = (max - min) <= this.config.stabilityTolerance;
    }

    // Conversión de unidad
    const conversion = UNIT_CONVERSIONS[this.config.unit];
    const convertedWeight = taredKg * conversion.factor;

    // Redondear según unidad
    const decimals = this.config.unit === "g" ? 0 : 3;
    const roundedWeight = parseFloat(convertedWeight.toFixed(decimals));

    const processed: ProcessedReading = {
      rawWeight: rawKg,
      weight: roundedWeight,
      unit: this.config.unit,
      stable,
      tareActive: this.tareOffset !== 0,
      tareOffset: this.tareOffset,
      raw: reading.raw,
    };

    this.emit("processed", processed);
    return processed;
  }

  /** Tarar: guardar el peso actual como offset */
  tare(): number {
    // Usar el promedio actual como tare
    if (this.recentReadings.length > 0) {
      this.tareOffset = this.recentReadings.reduce((a, b) => a + b, 0) / this.recentReadings.length;
    }
    this.emit("tare", this.tareOffset);
    return this.tareOffset;
  }

  /** Quitar tare (volver a cero real) */
  clearTare(): void {
    this.tareOffset = 0;
    this.emit("tare", 0);
  }

  /** Obtener valor actual de tare */
  getTareOffset(): number {
    return this.tareOffset;
  }

  /** Cambiar unidad de visualización */
  setUnit(unit: WeightUnit): void {
    this.config.unit = unit;
    this.emit("configChanged", this.config);
  }

  /** Cambiar la unidad en la que la balanza envía datos (según botón físico kg/lb) */
  setInputUnit(unit: WeightUnit): void {
    this.config.inputUnit = unit;
    // Limpiar buffers porque los valores cambian de escala
    this.recentReadings = [];
    this.stabilityBuffer = [];
    this.tareOffset = 0;
    this.emit("tare", 0);
    this.emit("configChanged", this.config);
  }

  /** Actualizar configuración completa */
  updateConfig(partial: Partial<ScaleProcessorConfig>): void {
    this.config = { ...this.config, ...partial };
    // Limpiar buffers si cambian los tamaños
    if (partial.averageSamples !== undefined) {
      this.recentReadings = [];
    }
    if (partial.stabilityCount !== undefined) {
      this.stabilityBuffer = [];
    }
    this.emit("configChanged", this.config);
  }

  /** Obtener configuración actual */
  getConfig(): ScaleProcessorConfig {
    return { ...this.config };
  }

  /** Resetear todo: tare, buffers */
  reset(): void {
    this.tareOffset = 0;
    this.recentReadings = [];
    this.stabilityBuffer = [];
    this.emit("reset");
  }

  /** Información estática de conversiones disponibles */
  static getAvailableUnits() {
    return Object.entries(UNIT_CONVERSIONS).map(([key, val]) => ({
      key,
      label: val.label,
      factor: val.factor,
    }));
  }
}
