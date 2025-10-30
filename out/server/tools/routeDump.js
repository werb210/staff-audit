function listLayers(stack, base = '') {
    const rows = [];
    for (const layer of stack) {
        // Router or route
        const route = layer.route;
        if (route) {
            const methods = Object.keys(route.methods)
                .filter(Boolean)
                .map(m => m.toUpperCase())
                .join(',');
            rows.push(`${methods.padEnd(10)} ${base}${route.path}`);
        }
        else if (layer.name === 'router' && layer.handle?.stack) {
            const path = layer.regexp?.fast_star ? '*' :
                layer.regexp?.fast_slash ? '/' :
                    (layer.regexp?.toString().match(/\\\/([^\\\(\?\:]+)\\\//)?.[1] ? `/${layer.regexp.toString().match(/\\\/([^\\\(\?\:]+)\\\//)?.[1]}` : '');
            rows.push(`ROUTER     ${base}${path}`);
            rows.push(...listLayers(layer.handle.stack, `${base}${path}`));
        }
    }
    return rows;
}
export function dumpRoutes(app) {
    // @ts-ignore private API, fine for diagnostics
    const stack = app?._router?.stack || [];
    const rows = listLayers(stack);
    console.log('=== ROUTE DUMP START ===');
    rows.forEach(r => console.log(r));
    console.log('=== ROUTE DUMP END ===');
}
