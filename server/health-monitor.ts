/**
 * Production Health Monitor
 * Monitors application health and performance
 */

export class HealthMonitor {
  static startTime = Date.now();
  static requestCount = 0;
  static errorCount = 0;

  static getHealthStatus() {
    const uptime = Date.now() - this.startTime;
    const memoryUsage = process.memoryUsage();
    
    return {
      status: 'healthy',
      uptime: Math.floor(uptime / 1000),
      requests: this.requestCount,
      errors: this.errorCount,
      errorRate: this.requestCount > 0 ? (this.errorCount / this.requestCount * 100).toFixed(2) + '%' : '0%',
      memory: {
        used: Math.round(memoryUsage.heapUsed / 1024 / 1024) + 'MB',
        total: Math.round(memoryUsage.heapTotal / 1024 / 1024) + 'MB'
      },
      environment: process.env.NODE_ENV || 'development'
    };
  }

  static recordRequest() {
    this.requestCount++;
  }

  static recordError() {
    this.errorCount++;
  }
}