import { WebSocketServer, WebSocket } from "ws";
type Room = string; // e.g., contact:{id} or thread:{id}

const rooms = new Map<Room, Set<WebSocket>>();

export function attachRealtime(server: import("http").Server) {
  const wss = new WebSocketServer({ server, path: "/ws" });
  wss.on("connection", (ws) => {
    ws.on("message", (raw) => {
      try {
        const msg = JSON.parse(String(raw));
        if (msg.type === "subscribe" && msg.room) {
          const set = rooms.get(msg.room) ?? new Set<WebSocket>();
          set.add(ws);
          rooms.set(msg.room, set);
          ws.once("close", () => { set.delete(ws); });
        }
      } catch {}
    });
  });
}

export function publish(room: Room, event: any) {
  const set = rooms.get(room);
  if (!set) return;
  const payload = JSON.stringify(event);
  for (const ws of set) {
    if (ws.readyState === ws.OPEN) ws.send(payload);
  }
}