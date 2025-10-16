// Simple WebSocket event system to fix missing import
import { socketManager } from './socket';

export function addEventListener(eventName: string, callback: (data: any) => void) {
  // Guard against socket connection floods in dev mode
  if (process.env.ENABLE_SOCKETS === "false") {
    console.info("[Comms] sockets disabled in this environment");
    return () => {}; // Return empty cleanup function
  }
  
  // Ensure socket is connected
  if (!socketManager.connected) {
    socketManager.connect();
  }
  
  // Add listener
  socketManager.on(eventName as any, callback);
  
  // Return cleanup function
  return () => {
    socketManager.off(eventName as any, callback);
  };
}

export function emit(eventName: string, data?: any) {
  if (process.env.ENABLE_SOCKETS === "false") {
    console.info("[Comms] sockets disabled in this environment");
    return;
  }
  
  if (socketManager.connected) {
    socketManager.emit(eventName, data);
  }
}

// Enhanced WebSocket with auth for fix pack
export function openAppSocket(path = "/ws") {
  const isSecure = location.protocol === "https:";
  const proto = isSecure ? "wss" : "ws";
  const url = `${proto}://${location.host}${path}`;

  // Pass session cookie implicitly (same-origin) + optional short JWT header via subprotocol
  const jwt = localStorage.getItem("ws.jwt") || "";
  const ws = jwt ? new WebSocket(url, ["jwt", jwt]) : new WebSocket(url);

  ws.addEventListener("error", (e) => console.debug("[WS] error", e));
  return ws;
}