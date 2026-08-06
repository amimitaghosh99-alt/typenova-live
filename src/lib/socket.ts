import { io, Socket } from 'socket.io-client';

// Production-ready Socket.io URL resolution.
// Priority:
//   1. VITE_SOCKET_URL (explicit override, e.g. deployed backend)
//   2. VITE_SOCKET_PROD_URL / VITE_SOCKET_DEV_URL (optional named envs)
//   3. Same-host inference: if hosted on a non-localhost domain, assume the
//      socket server is served from the same host on port 3001. This makes
//      local `npm run dev` (localhost:3001) and a paired deployment work with
//      zero extra configuration.
const resolveSocketUrl = (): string => {
  const explicit = import.meta.env.VITE_SOCKET_URL as string | undefined;
  if (explicit && explicit.trim()) return explicit.trim();

  const isProd = import.meta.env.PROD === true;
  const named = (isProd
    ? import.meta.env.VITE_SOCKET_PROD_URL
    : import.meta.env.VITE_SOCKET_DEV_URL) as string | undefined;
  if (named && named.trim()) return named.trim();

  // Fall back to same-origin inference.
  const { protocol, hostname } = window.location;
  // Local dev: http://localhost:5173 → ws://localhost:3001
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return `http://localhost:3001`;
  }
  // Deployed: https://app.example.com → https://app.example.com:3001
  return `${protocol}//${hostname}:3001`;
};

let socket: Socket | null = null;

/**
 * Returns the singleton Socket.io client instance.
 */
export const getSocket = (): Socket => {
  if (!socket) {
    socket = io(resolveSocketUrl(), {
      autoConnect: false, // Explicit connection control on entering VS mode
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });
  }
  return socket;
};

/**
 * Connects the socket if not already connected.
 */
export const connectSocket = (): Socket => {
  const s = getSocket();
  if (!s.connected) {
    s.connect();
  }
  return s;
};

/**
 * Disconnects the socket cleanly when exiting VS Mode.
 */
export const disconnectSocket = (): void => {
  if (socket && socket.connected) {
    socket.disconnect();
  }
  socket = null;
};