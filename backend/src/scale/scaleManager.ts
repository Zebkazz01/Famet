import { SerialPort } from "serialport";
import { ReadlineParser } from "@serialport/parser-readline";
import { EventEmitter } from "events";
import { parseScaleData, ScaleReading } from "./scaleParser";
import { ScaleProcessor, ProcessedReading, ScaleProcessorConfig, WeightUnit } from "./scaleProcessor";
import { log } from "../config/logger";

export class ScaleManager extends EventEmitter {
  private port: SerialPort | null = null;
  private parser: ReadlineParser | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private _connected = false;
  private _manualDisconnect = false;
  private portPath: string;
  private baudRate: number;
  public readonly processor: ScaleProcessor;

  constructor(portPath: string, baudRate: number = 9600, processorConfig?: Partial<ScaleProcessorConfig>) {
    super();
    this.portPath = portPath;
    this.baudRate = baudRate;
    this.processor = new ScaleProcessor(processorConfig);

    // Re-emitir eventos del procesador
    this.processor.on("processed", (reading: ProcessedReading) => {
      this.emit("processedWeight", reading);
    });
    this.processor.on("tare", (offset: number) => {
      this.emit("tare", offset);
    });
    this.processor.on("configChanged", (config: ScaleProcessorConfig) => {
      this.emit("processorConfigChanged", config);
    });
  }

  get connected() {
    return this._connected;
  }

  async connect(): Promise<void> {
    this._manualDisconnect = false;
    this.cleanup();

    try {
      this.port = new SerialPort({
        path: this.portPath,
        baudRate: this.baudRate,
        dataBits: 8,
        parity: "none",
        stopBits: 1,
        autoOpen: false,
      });

      this.parser = this.port.pipe(new ReadlineParser({ delimiter: "\r\n" }));

      this.parser.on("data", (line: string) => {
        const reading = parseScaleData(line);
        this.emit("rawData", line);
        if (reading) {
          this.emit("weight", reading);
          // Pasar por el procesador de software
          this.processor.process(reading);
        }
      });

      this.port.on("error", (err) => {
        log.error(`Puerto serial: ${err.message}`);
        this._connected = false;
        this.emit("disconnected", err.message);
        if (!this._manualDisconnect) this.scheduleReconnect();
      });

      this.port.on("close", () => {
        this._connected = false;
        this.emit("disconnected", "Puerto cerrado");
        if (!this._manualDisconnect) this.scheduleReconnect();
      });

      await new Promise<void>((resolve, reject) => {
        this.port!.open((err) => {
          if (err) {
            reject(err);
          } else {
            this._connected = true;
            this.emit("connected");
            resolve();
          }
        });
      });
    } catch (err: any) {
      this._connected = false;
      this.emit("error", err.message);
      this.scheduleReconnect();
      throw err;
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null;
      log.info("Reconectando balanza...");
      try {
        await this.connect();
        log.ok("Balanza reconectada");
      } catch {
        // Se reprogramará automáticamente
      }
    }, 3000);
  }

  async disconnect(): Promise<void> {
    this._manualDisconnect = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.cleanup();
    this.emit("disconnected", "Desconexión manual");
  }

  private cleanup() {
    if (this.port?.isOpen) {
      try {
        this.port.close();
      } catch {
        // Ignorar errores al cerrar
      }
    }
    this.port = null;
    this.parser = null;
    this._connected = false;
  }

  updateConfig(portPath: string, baudRate: number) {
    this.portPath = portPath;
    this.baudRate = baudRate;
  }

  // --- Atajos para funciones del procesador ---

  tare(): number {
    return this.processor.tare();
  }

  clearTare(): void {
    this.processor.clearTare();
  }

  setUnit(unit: WeightUnit): void {
    this.processor.setUnit(unit);
  }

  setInputUnit(unit: WeightUnit): void {
    this.processor.setInputUnit(unit);
  }

  getProcessorConfig(): ScaleProcessorConfig {
    return this.processor.getConfig();
  }

  updateProcessorConfig(config: Partial<ScaleProcessorConfig>): void {
    this.processor.updateConfig(config);
  }

  resetProcessor(): void {
    this.processor.reset();
  }

  static async listPorts() {
    const ports = await SerialPort.list();
    return ports.map((p) => ({
      path: p.path,
      manufacturer: p.manufacturer || "",
      vendorId: p.vendorId || "",
      productId: p.productId || "",
    }));
  }
}
