// Debug utility to catch array access issues
export function debugArrayAccess() {
    if (typeof window === "undefined" || process.env.NODE_ENV !== "development") {
        return;
    }
    // Monkey patch Array prototype to catch issues
    const originalMap = Array.prototype.map;
    Array.prototype.map = function (...args) {
        if (this == null || typeof this.map !== "function") {
            console.error("🚨 ARRAY ERROR: .map() called on non-array:", {
                type: typeof this,
                value: this,
                stack: new Error().stack,
            });
            return [];
        }
        return originalMap.apply(this, args);
    };
    const originalFilter = Array.prototype.filter;
    Array.prototype.filter = function (...args) {
        if (this == null || typeof this.filter !== "function") {
            console.error("🚨 ARRAY ERROR: .filter() called on non-array:", {
                type: typeof this,
                value: this,
                stack: new Error().stack,
            });
            return [];
        }
        return originalFilter.apply(this, args);
    };
    console.log("🔍 Debug array access monitoring enabled");
}
