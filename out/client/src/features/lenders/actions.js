export async function fetchLenderProducts() {
    const r = await fetch("/api/lenders/products");
    if (!r.ok)
        throw new Error("Failed to fetch lender products");
    return r.json();
}
