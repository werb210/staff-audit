"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerUse = registerUse;
exports.listMounts = listMounts;
const mounts = new Map(); // key = "USE:/api/foo"
function siteOf(e = new Error()) {
    const line = (e.stack || "").split("\n")[3] || "";
    return line.trim();
}
function registerUse(app, path, router, label) {
    const key = `USE:${path}`;
    if (mounts.has(key)) {
        const prev = mounts.get(key);
        throw new Error(`DUPLICATE ROUTE MOUNT: ${key}\nExisting: ${prev.label} @ ${prev.at}\nAttempted: ${label} @ ${siteOf()}`);
    }
    mounts.set(key, { method: "USE", path, label, at: siteOf() });
    app.use(path, router);
}
function listMounts() {
    return Array.from(mounts.values());
}
