const mounted = new Set();
export function mountOnce(app, path, router) {
    if (mounted.has(path)) {
        console.warn(`[ROUTES] Skipping duplicate mount: ${path}`);
        return;
    }
    app.use(path, router);
    mounted.add(path);
}
