export function uniqBy(xs, key) {
    const m = new Map();
    for (const x of xs)
        if (!m.has(x[key]))
            m.set(x[key], x);
    return [...m.values()];
}
