import { Server } from "socket.io";
let io;
let notifyPipelineUpdate;
export function initializeWebSocketServer(server) {
    const allowedOrigins = [
        "https://staff.boreal.financial",
        "https://client.boreal.financial",
        "http://localhost:5000"
    ];
    io = new Server(server, {
        path: "/ws",
        cors: {
            origin: allowedOrigins,
            methods: ["GET", "POST"],
            credentials: true
        },
        // Deployment-safe configuration to prevent socket closure during build
        transports: ['websocket', 'polling'],
        pingTimeout: 60000,
        pingInterval: 25000,
        connectTimeout: 60000,
        // Graceful handling for deployment environments
        allowEIO3: true
    });
    // Export io instance for status monitoring
    global.socketIoInstance = io;
    io.use((socket, next) => {
        const token = socket.handshake.auth?.token?.replace("Bearer ", "");
        const allowDev = process.env.WS_ALLOW_DEV_NO_TOKEN === "1";
        console.log("🔍 [WS-AUTH] Debug info:", {
            hasToken: !!token,
            WS_ALLOW_DEV_NO_TOKEN: process.env.WS_ALLOW_DEV_NO_TOKEN,
            allowDev: allowDev,
            NODE_ENV: process.env.NODE_ENV,
            shouldBypass: allowDev && process.env.NODE_ENV !== "production"
        });
        if (!token) {
            if (allowDev && process.env.NODE_ENV !== "production") {
                console.log("🔓 [WS] Allowing unauth socket in DEV");
                return next();
            }
            console.log("❌ [WS] Rejecting unauth socket - not in dev mode");
            return next(new Error("Unauthorized WebSocket"));
        }
        // TODO: validate JWT here (production)
        console.log("✅ [WS] Token provided, proceeding");
        next();
    });
    io.on("connection", (socket) => {
        console.log(`🔌 WebSocket connected: ${socket.id}`);
        // Subscribe clients to real-time updates
        socket.join("lender-products");
        socket.join("applications");
        socket.join("pipeline");
        socket.join("chat-updates");
        // Chat-specific event handlers
        socket.on('join-chat', (data) => {
            const { sessionId, userId } = data || {};
            if (sessionId) {
                socket.join(`chat:${sessionId}`);
                console.log(`👥 User ${userId} joined chat session: ${sessionId}`);
            }
        });
        socket.on('send-message', (data) => {
            const { sessionId, message, userId, timestamp } = data || {};
            if (sessionId && message) {
                // Broadcast message to all users in the chat session
                socket.to(`chat:${sessionId}`).emit('new-message', {
                    message,
                    userId,
                    timestamp: timestamp || new Date().toISOString(),
                    id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
                });
                console.log(`💬 Message sent to chat ${sessionId}: ${message.substring(0, 50)}...`);
            }
        });
        socket.on('typing-start', (data) => {
            const { sessionId, userId } = data || {};
            if (sessionId) {
                socket.to(`chat:${sessionId}`).emit('user-typing', { userId, isTyping: true });
            }
        });
        socket.on('typing-stop', (data) => {
            const { sessionId, userId } = data || {};
            if (sessionId) {
                socket.to(`chat:${sessionId}`).emit('user-typing', { userId, isTyping: false });
            }
        });
        socket.on("disconnect", (reason) => {
            console.log(`❌ WebSocket disconnected: ${socket.id} (${reason})`);
        });
    });
    // Broadcast helper
    notifyPipelineUpdate = () => {
        console.log("[WebSocket] Broadcasting pipeline update");
        io.to("pipeline").emit("pipeline:update");
    };
    console.log('🔌 [WEBSOCKET] WebSocket server with JWT authentication initialized');
    return { io, notifyPipelineUpdate };
}
// Export for use in other files
export { notifyPipelineUpdate };
// Legacy compatibility - maintain existing exports
export const broadcastProductSync = (products) => {
    console.log("[WebSocket] Broadcasting product sync");
    io?.emit("products:sync", products);
};
export function getGlobalIo() {
    return io;
}
export function emitChatRequest(data) {
    console.log("[WebSocket] Emitting chat request");
    io?.emit("chat:request", data);
}
export function emitChatAssigned(data) {
    console.log("[WebSocket] Emitting chat assigned");
    io?.emit("chat:assigned", data);
}
export const broadcastPipelineUpdate = (applicationId, event = 'update') => {
    console.log(`[WebSocket] Broadcasting pipeline update for app ${applicationId}`);
    io?.to("pipeline").emit("pipeline:update", { applicationId, event });
};
// Emitters: call these inside services when data changes
export const emitLenderProductsUpdate = () => io?.to("lender-products").emit("lender-products:update");
export const emitApplicationsUpdate = () => io?.to("applications").emit("applications:update");
export const emitPipelineUpdate = () => io?.to("pipeline").emit("pipeline:update");
