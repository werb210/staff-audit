import React, { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useTenant } from "../tenant/TenantProvider";

// SSE connection manager
class SSEManager {
  private static instance: SSEManager;
  private connections: Map<string, EventSource> = new Map();

  static getInstance(): SSEManager {
    if (!SSEManager.instance) {
      SSEManager.instance = new SSEManager();
    }
    return SSEManager.instance;
  }

  connect(endpoint: string, handlers: Record<string, (event: MessageEvent) => void>): EventSource {
    // Close existing connection for this endpoint
    this.disconnect(endpoint);

    const eventSource = new EventSource(endpoint);
    
    // Set up event handlers
    Object.entries(handlers).forEach(([event, handler]) => {
      eventSource.addEventListener(event, handler);
    });

    // Handle connection events
    eventSource.onopen = () => {
      console.log(`✅ SSE connected to ${endpoint}`);
    };

    eventSource.onerror = (error) => {
      console.error(`❌ SSE error for ${endpoint}:`, error);
    };

    this.connections.set(endpoint, eventSource);
    return eventSource;
  }

  disconnect(endpoint?: string): void {
    if (endpoint) {
      const connection = this.connections.get(endpoint);
      if (connection) {
        connection.close();
        this.connections.delete(endpoint);
        console.log(`🔌 SSE disconnected from ${endpoint}`);
      }
    } else {
      // Disconnect all connections
      this.connections.forEach((connection, endpoint) => {
        connection.close();
        console.log(`🔌 SSE disconnected from ${endpoint}`);
      });
      this.connections.clear();
    }
  }

  getConnection(endpoint: string): EventSource | undefined {
    return this.connections.get(endpoint);
  }

  isConnected(endpoint: string): boolean {
    const connection = this.connections.get(endpoint);
    return connection ? connection.readyState === EventSource.OPEN : false;
  }
}

const disconnectSSE = () => {
  SSEManager.getInstance().disconnect();
};

const SiloBoundary: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const tenant = useTenant();
  const qc = useQueryClient();

  useEffect(() => {
    // On every silo change: drop client cache & close any event streams
    qc.clear();
    disconnectSSE();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenant]);

  return <div data-silo={tenant}>{children}</div>;
};

export default SiloBoundary;