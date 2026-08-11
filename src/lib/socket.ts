import { io, Socket } from 'socket.io-client';

// Production-ready Socket.io URL resolution.
// Priority:
//   1. VITE_SOCKET_URL (explicit override, e.g. deployed backend)
//   2. Local Development (localhost)
//   3. Production Render URL
const resolveSocketUrl = (): string => {
  const explicit = import.meta.env.VITE_SOCKET_URL as string | undefined;
  if (explicit && explicit.trim()) return explicit.trim();

  // 1. Local Development (Testing on your laptop)
  const { hostname } = window.location;
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    // Note: Change this to 3001 if your local server runs on 3001 instead of 3000
    return `http://localhost:3000`;
  }

  // 2. Production (Vercel talking to Render)
  return "https://typenova-server.onrender.com";
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