import { WebSocketServer } from "ws";
const rooms = new Map();
export function attachRealtime(server) {
    const wss = new WebSocketServer({ server, path: "/ws" });
    wss.on("connection", (ws) => {
        ws.on("message", (raw) => {
            try {
                const msg = JSON.parse(String(raw));
                if (msg.type === "subscribe" && msg.room) {
                    const set = rooms.get(msg.room) ?? new Set();
                    set.add(ws);
                    rooms.set(msg.room, set);
                    ws.once("close", () => { set.delete(ws); });
                }
            }
            catch { }
        });
    });
}
export function publish(room, event) {
    const set = rooms.get(room);
    if (!set)
        return;
    const payload = JSON.stringify(event);
    for (const ws of set) {
        if (ws.readyState === ws.OPEN)
            ws.send(payload);
    }
}
