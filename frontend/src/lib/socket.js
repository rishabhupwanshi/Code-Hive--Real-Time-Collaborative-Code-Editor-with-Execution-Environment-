// Singleton Socket.IO connection to the backend's collaboration server
// (CollaborationSocketHandler / SocketIOConfig, port 9092 by default —
// separate from the REST API on 8086). Created once and reused by any
// component that needs live collaboration, so we don't open a new socket
// per render.
import { io } from "socket.io-client";

const SOCKET_URL = "http://localhost:9092";

let socket = null;

export function getSocket() {
  if (!socket) {
    socket = io(SOCKET_URL, {
      transports: ["websocket"],
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 500,
      reconnectionDelayMax: 3000,
    });
  }
  return socket;
}
