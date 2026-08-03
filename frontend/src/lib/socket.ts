import { io, Socket } from 'socket.io-client';

let rootSocket: Socket | null = null;

function currentToken(): string | undefined {
  try {
    return localStorage.getItem('token') || undefined;
  } catch {
    return undefined;
  }
}

/**
 * Singleton del socket raíz (namespace `/`). Reusado por notificaciones,
 * config:updated y futuras emisiones cross-módulo. ScaleContext mantiene
 * su propio socket en namespace `/scale`.
 */
export function getRootSocket(): Socket {
  if (rootSocket && rootSocket.connected) return rootSocket;
  if (rootSocket) {
    // Existe pero desconectado — intentar reconectar
    rootSocket.connect();
    return rootSocket;
  }
  rootSocket = io('/', {
    transports: ['websocket', 'polling'],
    reconnectionAttempts: 3,
    reconnectionDelay: 2000,
    timeout: 8000,
    auth: { token: currentToken() },
    autoConnect: false,
  });
  rootSocket.on('connect_error', () => {
    console.warn('[Socket] Connection failed, retrying...');
  });
  rootSocket.on('disconnect', () => {
    console.warn('[Socket] Disconnected');
  });
  rootSocket.connect();
  return rootSocket;
}

/** Refresca auth.token y reconecta (llamar tras login/logout). */
export function refreshSocketAuth(): void {
  if (!rootSocket) return;
  rootSocket.auth = { token: currentToken() };
  if (rootSocket.connected) {
    rootSocket.disconnect();
  }
  rootSocket.connect();
}

export function disconnectRootSocket(): void {
  if (rootSocket) {
    rootSocket.disconnect();
    rootSocket = null;
  }
}
