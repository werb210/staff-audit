import { Router } from "express";
let io = null;
// Setter to pass the WebSocket server instance
export const setIo = (instance) => {
    io = instance;
};
const router = Router();
// Public endpoint for debugging WebSocket status (no auth required)
router.get("/", (_req, res) => {
    // Force bypass auth by setting this as a health check endpoint
    res.setHeader('X-Public-Endpoint', 'true');
    if (!io)
        return res.status(500).json({ status: "error", message: "WebSocket not initialized" });
    const rooms = io.sockets.adapter.rooms;
    const sockets = Array.from(io.sockets.sockets.values());
    return res.json({
        status: "ok",
        rooms: Array.from(rooms.keys()),
        connectedSockets: sockets.map((s) => s.id),
        totalConnections: sockets.length
    });
});
export default router;
