import type { Server as SocketServer } from "socket.io";

let ioInstance: SocketServer | null = null;

export function setIO(io: SocketServer): void {
  ioInstance = io;
}

export function getIO(): SocketServer | null {
  return ioInstance;
}

export function emitToUser(userId: number | string, event: string, payload: unknown): void {
  if (!ioInstance) return;
  ioInstance.to(`user:${userId}`).emit(event, payload);
}

export function emitToRole(role: string, event: string, payload: unknown): void {
  if (!ioInstance) return;
  ioInstance.to(`role:${role}`).emit(event, payload);
}

export function emitBroadcast(event: string, payload: unknown): void {
  if (!ioInstance) return;
  ioInstance.emit(event, payload);
}

export function joinUserRoom(socketId: string, userId: number | string, role?: string): void {
  if (!ioInstance) return;
  const socket = ioInstance.sockets.sockets.get(socketId);
  if (!socket) return;
  socket.join(`user:${userId}`);
  if (role) socket.join(`role:${role}`);
}
