function getCaller() {
    const e = new Error();
    const s = (e.stack || '').split('\n');
    // stack[0]=Error, [1]=this fn, [2]=caller; adjust if needed
    return (s[2] || '').trim();
}
export function registerUse(app, path, router, label) {
    const src = label || `${path} :: ${getCaller()}`;
    const tagger = (req, res, next) => {
        if (process.env.TRACE_DUPES === '1') {
            const prev = res.getHeader('X-Route-Matches') || '';
            res.setHeader('X-Route-Matches', prev ? `${prev}|${src}` : src);
        }
        next();
    };
    app.use(path, tagger, router);
}
