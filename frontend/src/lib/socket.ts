import { io, Socket } from 'socket.io-client';

let rootSocket: Socket | null = null;

function currentToken(): string | undefined {
  try {
    return localStorage.getItem('token') || undefined;
  } catch {
    return undefined;
  }
}

// Detect demo mode (Vercel deployment)
function isDemoMode(): boolean {
  return import.meta.env.VITE_API_URL === '/api' || 
         window.location.hostname.includes('vercel.app');
}

/**
 * Singleton del socket raíz (namespace `/`). Reusado por notificaciones,
 * config:updated y futuras emisiones cross-módulo. ScaleContext mantiene
 * su propio socket en namespace `/scale`.
 */
export function getRootSocket(): Socket | null {
  // In demo mode (Vercel), WebSockets aren't supported
  if (isDemoMode()) {
    console.log('[FAMEAT] Demo mode - Socket.IO disabled');
    return null;
  }

  if (rootSocket && rootSocket.connected) return rootSocket;
  if (rootSocket) {
    rootSocket.connect();
    return rootSocket;
  }
  
  rootSocket = io('/', {
    transports: ['websocket', 'polling'],
    reconnectionAttempts: Infinity,
    reconnectionDelay: 2000,
    timeout: 8000,
    auth: { token: currentToken() },
  });
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
