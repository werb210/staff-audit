export function assertSingleStatic(app) {
    const layers = app._router?.stack || [];
    const statics = layers.filter((l) => l?.name === "serveStatic");
    if (statics.length > 1) {
        const hint = statics.map((s, i) => `#${i}: ${s?.regexp}`).join("\n");
        // Log loudly and prefer the LAST one by removing earlier mounts
        console.warn(`[static-guard] multiple express.static detected:\n${hint}`);
        // Optional: throw to make the misconfig obvious
        // throw new Error("Multiple express.static mounts detected");
    }
}
