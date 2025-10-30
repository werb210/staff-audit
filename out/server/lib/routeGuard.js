// Route Guard - Runtime protection against duplicate registrations
const registeredRoutes = new Set();
const routeLog = [];
export function guardedRegisterUse(app, path, router, name) {
    const routeKey = `${path}`;
    // Check for exact duplicate
    if (registeredRoutes.has(routeKey)) {
        console.error(`🚨 [ROUTE GUARD] Duplicate route registration blocked: ${routeKey}`);
        console.error(`   Attempted to register: ${name}`);
        console.error(`   Already registered by: ${routeLog.find(r => r.path === path)?.name || 'unknown'}`);
        // In development, throw error to catch issues immediately
        if (process.env.NODE_ENV === 'development') {
            throw new Error(`Duplicate route registration: ${routeKey} (${name})`);
        }
        return false;
    }
    // Check for dangerous generic routes
    const dangerousPatterns = [
        { pattern: /^\/api$/, message: 'Generic /api route is dangerous - use specific paths' },
        { pattern: /^\/api\/[^\/]*$/, message: 'Very broad API route - consider more specific paths' }
    ];
    for (const { pattern, message } of dangerousPatterns) {
        if (pattern.test(path)) {
            console.warn(`⚠️  [ROUTE GUARD] ${message}: ${path} (${name})`);
            // In strict mode, block dangerous routes
            if (process.env.STRICT_ROUTING === 'true') {
                throw new Error(`Dangerous route pattern blocked: ${path}`);
            }
        }
    }
    // Register the route
    registeredRoutes.add(routeKey);
    routeLog.push({ path, name, timestamp: new Date() });
    // Actually register with Express
    app.use(path, router);
    console.log(`✅ [ROUTE GUARD] Registered: ${routeKey} (${name})`);
    return true;
}
export function getRouteRegistry() {
    return {
        routes: Array.from(registeredRoutes),
        log: [...routeLog],
        count: registeredRoutes.size
    };
}
export function clearRouteRegistry() {
    registeredRoutes.clear();
    routeLog.length = 0;
}
// Validation function for testing
export function validateUniqueRoutes() {
    const seen = new Set();
    const duplicates = [];
    routeLog.forEach(({ path }) => {
        if (seen.has(path)) {
            duplicates.push(path);
        }
        seen.add(path);
    });
    return {
        valid: duplicates.length === 0,
        duplicates
    };
}
