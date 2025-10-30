/**
 * 🚨 PHASE 3: ALERT SYSTEM
 * Real-time alerting for upload failures and system issues
 */
import fs from 'fs/promises';
import path from 'path';
const ALERTS_FILE = 'logs/system-alerts.json';
const MAX_ALERTS = 1000;
class AlertSystem {
    alerts = [];
    loaded = false;
    async loadAlerts() {
        if (this.loaded)
            return;
        try {
            const data = await fs.readFile(ALERTS_FILE, 'utf-8');
            this.alerts = JSON.parse(data);
            console.log(`📊 [ALERTS] Loaded ${this.alerts.length} existing alerts`);
        }
        catch (error) {
            console.log('📊 [ALERTS] No existing alerts file, starting fresh');
            this.alerts = [];
        }
        this.loaded = true;
    }
    async saveAlerts() {
        try {
            await fs.mkdir(path.dirname(ALERTS_FILE), { recursive: true });
            // Keep only the most recent alerts
            if (this.alerts.length > MAX_ALERTS) {
                this.alerts = this.alerts.slice(-MAX_ALERTS);
            }
            await fs.writeFile(ALERTS_FILE, JSON.stringify(this.alerts, null, 2));
        }
        catch (error) {
            console.error('❌ [ALERTS] Failed to save alerts:', error);
        }
    }
    async triggerAlert(alert) {
        await this.loadAlerts();
        const newAlert = {
            id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date().toISOString(),
            resolved: false,
            ...alert
        };
        this.alerts.push(newAlert);
        await this.saveAlerts();
        console.log(`🚨 [ALERT-${alert.severity.toUpperCase()}] ${alert.message}`);
        if (alert.severity === 'critical') {
            console.log(`🔥 [CRITICAL ALERT] ${alert.message} - Immediate attention required`);
        }
        // Log alert details
        if (alert.details) {
            console.log('📋 [ALERT-DETAILS]', JSON.stringify(alert.details, null, 2));
        }
    }
    async getSystemStatus() {
        await this.loadAlerts();
        const now = Date.now();
        const last24h = now - 24 * 60 * 60 * 1000;
        const lastHour = now - 60 * 60 * 1000;
        const alertStats = {
            total: this.alerts.length,
            last24Hours: this.alerts.filter(a => new Date(a.timestamp).getTime() > last24h).length,
            lastHour: this.alerts.filter(a => new Date(a.timestamp).getTime() > lastHour).length,
            criticalLast24h: this.alerts.filter(a => new Date(a.timestamp).getTime() > last24h &&
                a.severity === 'critical' &&
                !a.resolved).length,
            uploadFailuresLast24h: this.alerts.filter(a => new Date(a.timestamp).getTime() > last24h &&
                a.type === 'upload_failure').length
        };
        // Determine system status
        let status = 'HEALTHY';
        if (alertStats.criticalLast24h > 0) {
            status = 'CRITICAL';
        }
        else if (alertStats.last24Hours > 5 || alertStats.uploadFailuresLast24h > 3) {
            status = 'WARNING';
        }
        // Check upload freeze status
        let uploadsFrozen = false;
        try {
            const freezeData = await fs.readFile('logs/upload-freeze.json', 'utf-8');
            const freezeState = JSON.parse(freezeData);
            uploadsFrozen = freezeState.frozen || false;
        }
        catch {
            uploadsFrozen = false;
        }
        return {
            status,
            uploadsFrozen,
            alertStats,
            recentAlerts: this.alerts.slice(-10).reverse() // Most recent first
        };
    }
    async getRecentAlerts(limit = 50) {
        await this.loadAlerts();
        return this.alerts.slice(-limit).reverse();
    }
    async clearAlerts() {
        this.alerts = [];
        await this.saveAlerts();
        console.log('🧹 [ALERTS] All alerts cleared');
    }
    async resolveAlert(alertId) {
        await this.loadAlerts();
        const alert = this.alerts.find(a => a.id === alertId);
        if (alert) {
            alert.resolved = true;
            await this.saveAlerts();
            console.log(`✅ [ALERTS] Resolved alert: ${alertId}`);
            return true;
        }
        return false;
    }
}
// Export singleton instance
export const alertSystem = new AlertSystem();
// Export additional functions for backward compatibility
export const alertDataLoss = (details) => alertSystem.triggerAlert({
    type: 'data_loss',
    severity: 'critical',
    message: 'Data loss detected',
    details
});
export const getSystemStatus = () => alertSystem.getSystemStatus();
