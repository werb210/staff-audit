import { io } from "socket.io-client";
class SocketManager {
    socket = null;
    listeners = new Map();
    connecting = false;
    connect(token) {
        // Prevent multiple concurrent connections
        if (this.connecting || this.socket?.connected) {
            return this.socket;
        }
        this.connecting = true;
        // Socket.IO connects to base URL, not /ws path
        const wsUrl = window.location.origin;
        // Clean up existing socket first
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
        this.socket = io(wsUrl, {
            auth: token ? { token } : undefined,
            transports: ["websocket", "polling"], // Allow fallback to polling
            autoConnect: true,
            timeout: 5000,
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionAttempts: 3,
            path: "/ws", // Match server WebSocket path configuration
        });
        this.socket.on("connect", () => {
            this.connecting = false;
            // console.log('✅ WebSocket connected'); // Removed debug log
        });
        this.socket.on("disconnect", (reason) => {
            this.connecting = false;
            // console.log('❌ WebSocket disconnected:', reason); // Removed debug log
        });
        this.socket.on("connect_error", (error) => {
            this.connecting = false;
            console.warn("🔴 WebSocket connection error:", error.message);
        });
        return this.socket;
    }
    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
            this.connecting = false;
        }
        // Clear all listeners
        this.listeners.clear();
    }
    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(callback);
        if (this.socket) {
            this.socket.on(event, callback);
        }
    }
    off(event, callback) {
        const eventListeners = this.listeners.get(event);
        if (eventListeners) {
            const index = eventListeners.indexOf(callback);
            if (index > -1) {
                eventListeners.splice(index, 1);
            }
        }
        if (this.socket) {
            this.socket.off(event, callback);
        }
    }
    emit(event, data) {
        if (this.socket?.connected) {
            this.socket.emit(event, data);
        }
    }
    get connected() {
        return this.socket?.connected ?? false;
    }
}
// Export singleton instance
export const socketManager = new SocketManager();
export default socketManager;
