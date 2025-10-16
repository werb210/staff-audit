import { io, Socket } from 'socket.io-client';

interface SocketEvents {
  // Pipeline events
  'pipeline:card-moved': (data: { cardId: string; fromStage: string; toStage: string }) => void;
  'pipeline:card-updated': (data: { cardId: string; updates: any }) => void;
  'pipeline:notification': (data: { message: string; type: 'info' | 'success' | 'warning' | 'error' }) => void;
  
  // System events
  'system:notification': (data: { title: string; message: string; type: string }) => void;
  'user:activity': (data: { userId: string; action: string; timestamp: string }) => void;
}

class SocketManager {
  private socket: Socket | null = null;
  private listeners: Map<string, Function[]> = new Map();
  private connecting: boolean = false;

  connect(token?: string): Socket {
    // Prevent multiple concurrent connections
    if (this.connecting || this.socket?.connected) {
      return this.socket!;
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
      transports: ['websocket', 'polling'], // Allow fallback to polling
      autoConnect: true,
      timeout: 5000,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 3,
      path: '/ws', // Match server WebSocket path configuration
    });

    this.socket.on('connect', () => {
      this.connecting = false;
      // console.log('✅ WebSocket connected'); // Removed debug log
    });

    this.socket.on('disconnect', (reason) => {
      this.connecting = false;
      // console.log('❌ WebSocket disconnected:', reason); // Removed debug log
    });

    this.socket.on('connect_error', (error) => {
      this.connecting = false;
      console.warn('🔴 WebSocket connection error:', error.message);
    });

    return this.socket;
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connecting = false;
    }
    // Clear all listeners
    this.listeners.clear();
  }

  on<K extends keyof SocketEvents>(event: K, callback: SocketEvents[K]): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);

    if (this.socket) {
      this.socket.on(event, callback as any);
    }
  }

  off<K extends keyof SocketEvents>(event: K, callback: SocketEvents[K]): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      const index = eventListeners.indexOf(callback);
      if (index > -1) {
        eventListeners.splice(index, 1);
      }
    }

    if (this.socket) {
      this.socket.off(event, callback as any);
    }
  }

  emit(event: string, data?: any): void {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
    }
  }

  get connected(): boolean {
    return this.socket?.connected ?? false;
  }
}

// Export singleton instance
export const socketManager = new SocketManager();
export default socketManager;