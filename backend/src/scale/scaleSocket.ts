import { Server as SocketServer } from "socket.io";
import { ScaleManager } from "./scaleManager";
import { ScaleReading } from "./scaleParser";
import { ProcessedReading } from "./scaleProcessor";

export function setupScaleSocket(io: SocketServer, scaleManager: ScaleManager) {
  const scaleNamespace = io.of("/scale");

  // Peso crudo (sin procesar)
  scaleManager.on("weight", (reading: ScaleReading) => {
    scaleNamespace.emit("weight", reading);
  });

  // Peso procesado (con tare, unidad, filtro, promedio)
  scaleManager.on("processedWeight", (reading: ProcessedReading) => {
    scaleNamespace.emit("processedWeight", reading);
  });

  scaleManager.on("rawData", (line: string) => {
    scaleNamespace.emit("rawData", line);
  });

  scaleManager.on("connected", () => {
    scaleNamespace.emit("status", { connected: true });
  });

  scaleManager.on("disconnected", (reason: string) => {
    scaleNamespace.emit("status", { connected: false, reason });
  });

  scaleManager.on("tare", (offset: number) => {
    scaleNamespace.emit("tare", { active: offset !== 0, offset });
  });

  scaleManager.on("processorConfigChanged", (config: any) => {
    scaleNamespace.emit("processorConfig", config);
  });

  scaleNamespace.on("connection", (socket) => {
    // Enviar estado actual al conectar
    socket.emit("status", { connected: scaleManager.connected });
    socket.emit("processorConfig", scaleManager.getProcessorConfig());
    const tareOffset = scaleManager.processor.getTareOffset();
    socket.emit("tare", { active: tareOffset !== 0, offset: tareOffset });

    // Escuchar comandos desde el frontend
    socket.on("tare", () => {
      scaleManager.tare();
    });

    socket.on("clearTare", () => {
      scaleManager.clearTare();
    });

    socket.on("setUnit", (unit: string) => {
      if (["kg", "lb", "g"].includes(unit)) {
        scaleManager.setUnit(unit as "kg" | "lb" | "g");
      }
    });

    socket.on("setInputUnit", (unit: string) => {
      if (["kg", "lb", "g"].includes(unit)) {
        scaleManager.setInputUnit(unit as "kg" | "lb" | "g");
      }
    });

    socket.on("updateProcessorConfig", (config: any) => {
      scaleManager.updateProcessorConfig(config);
    });

    socket.on("resetProcessor", () => {
      scaleManager.resetProcessor();
    });
  });
}
