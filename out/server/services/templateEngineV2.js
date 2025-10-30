import { Liquid } from "liquidjs";
const engine = new Liquid({
    strictFilters: false,
    strictVariables: false,
});
// Add custom filters
engine.registerFilter('capitalize', (v) => v?.charAt(0).toUpperCase() + v?.slice(1));
engine.registerFilter('phone', (v) => {
    // Format phone number: +1234567890 -> (123) 456-7890
    if (!v)
        return v;
    const clean = v.replace(/\D/g, '');
    if (clean.length === 10)
        return `(${clean.slice(0, 3)}) ${clean.slice(3, 6)}-${clean.slice(6)}`;
    if (clean.length === 11 && clean[0] === '1')
        return `(${clean.slice(1, 4)}) ${clean.slice(4, 7)}-${clean.slice(7)}`;
    return v;
});
engine.registerFilter('money', (v) => v ? `$${v.toLocaleString()}` : '$0');
export async function renderLiquid(template, variables) {
    try {
        return await engine.parseAndRender(template, variables);
    }
    catch (error) {
        console.error('Liquid template error:', error);
        return `[Template Error: ${error}]`;
    }
}
