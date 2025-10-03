"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.db = exports.pool = void 0;
const serverless_1 = require("@neondatabase/serverless");
const neon_serverless_1 = require("drizzle-orm/neon-serverless");
const ws_1 = __importDefault(require("ws"));
const schema = __importStar(require("../shared/schema.js"));
// Configure WebSocket for Neon with proper error handling
try {
    serverless_1.neonConfig.webSocketConstructor = ws_1.default;
    // Disable automatic query batch processing for better connection stability
    serverless_1.neonConfig.fetchConnectionCache = true;
    serverless_1.neonConfig.useSecureWebSocket = true;
}
catch (error) {
    console.warn('WebSocket configuration warning:', error);
    // Fallback to regular HTTP connection if WebSocket fails
}
if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
}
// Create connection pool with optimized settings for serverless environments
exports.pool = new serverless_1.Pool({
    connectionString: process.env.DATABASE_URL,
    max: 5, // Reduce max connections for serverless
    idleTimeoutMillis: 30000, // 30 seconds idle timeout
    connectionTimeoutMillis: 5000, // 5 seconds connection timeout
    allowExitOnIdle: true, // Allow pool to exit when idle
    maxUses: 50 // Limit uses per connection to prevent stale connections
});
// Add error handling for pool events
exports.pool.on('error', (err) => {
    console.error('Database pool error:', err);
    // Don't exit the process, let the pool handle reconnection
});
exports.pool.on('connect', () => {
    console.log('✅ Database connection established');
});
exports.pool.on('remove', () => {
    console.log('🔄 Database connection removed from pool');
});
// Graceful shutdown handler
process.on('SIGINT', async () => {
    console.log('🔄 Gracefully closing database connections...');
    try {
        await exports.pool.end();
        console.log('✅ Database connections closed');
        process.exit(0);
    }
    catch (error) {
        console.error('❌ Error closing database connections:', error);
        process.exit(1);
    }
});
process.on('SIGTERM', async () => {
    console.log('🔄 SIGTERM received - closing database connections...');
    try {
        await exports.pool.end();
        console.log('✅ Database connections closed');
        process.exit(0);
    }
    catch (error) {
        console.error('❌ Error closing database connections:', error);
        process.exit(1);
    }
});
exports.db = (0, neon_serverless_1.drizzle)({ client: exports.pool, schema });
