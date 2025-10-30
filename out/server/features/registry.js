class FeatureRegistry {
    static _i;
    static get() { return (this._i ??= new FeatureRegistry()); }
    features = new Map();
    telemetry = [];
    register(f) {
        this.features.set(f.id, f);
    }
    list() {
        return Array.from(this.features.values());
    }
    staticList() {
        return this.list();
    }
    recordEvent(e) {
        this.telemetry.push(e);
        // Keep only last 1000 events to prevent memory bloat
        if (this.telemetry.length > 1000) {
            this.telemetry = this.telemetry.slice(-500);
        }
    }
    setOption(id, key, value) {
        const f = this.features.get(id);
        if (!f)
            return;
        f.options = { ...(f.options ?? {}), [key]: value };
    }
    wiringStatus() {
        const since = Date.now() - 24 * 60 * 60 * 1000; // 24 hours
        const recent = this.telemetry.filter(e => e.at >= since);
        const seen = (id, kind) => recent.some(e => e.featureId === id && e.kind === kind);
        const rows = this.list().map(f => ({
            id: f.id,
            name: f.name,
            actionAvailable: seen(f.id, "action-available") || !!f.hasActionButton,
            panelMounted: seen(f.id, "panel-mounted") || !!f.hasOutputPanel,
            lastEventAt: recent.slice().reverse().find(e => e.featureId === f.id)?.at ?? null,
            options: f.options ?? {},
            connected: (seen(f.id, "action-available") || !!f.hasActionButton) &&
                (seen(f.id, "panel-mounted") || !!f.hasOutputPanel),
            gaps: {
                actionMissing: !(seen(f.id, "action-available") || !!f.hasActionButton),
                outputMissing: !(seen(f.id, "panel-mounted") || !!f.hasOutputPanel),
            }
        }));
        const counts = {
            total: rows.length,
            connected: rows.filter(r => r.connected).length,
            needsAction: rows.filter(r => r.gaps.actionMissing).length,
            needsPanel: rows.filter(r => r.gaps.outputMissing).length,
        };
        return { rows, counts };
    }
}
export const getFeatureRegistry = () => FeatureRegistry.get();
// Initialize features
const reg = getFeatureRegistry();
[
    { id: "pipeline", name: "Sales Pipeline", hasActionButton: true, hasOutputPanel: true },
    { id: "banking-analysis", name: "Banking Analysis", hasActionButton: true, hasOutputPanel: true, options: { verbosity: "normal" } },
    { id: "credit-summary", name: "Credit Summary", hasActionButton: true, hasOutputPanel: true },
    { id: "lenders", name: "Lenders", hasActionButton: true, hasOutputPanel: true },
    { id: "voice-dialer", name: "Voice Dialer", hasActionButton: true, hasOutputPanel: false },
    { id: "ads-analytics", name: "Ads Analytics", hasActionButton: false, hasOutputPanel: true },
    { id: "pdf-generator", name: "PDF Generator", hasActionButton: true, hasOutputPanel: false },
    { id: "presence-monitoring", name: "Presence Monitoring", hasActionButton: false, hasOutputPanel: true },
].forEach(f => reg.register(f));
