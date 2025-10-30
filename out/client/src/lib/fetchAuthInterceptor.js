import { tokenStore } from "./tokenStore";
export async function fetchWithAuth(input, init = {}, isPublic = false) {
    const headers = new Headers(init.headers || {});
    const access = tokenStore.getAccess();
    if (!isPublic && access)
        headers.set("Authorization", `Bearer ${access}`);
    const r = await fetch(input, { ...init, headers });
    if (r.status === 401 && !isPublic) {
        const newAccess = tokenStore.getAccess();
        const h2 = new Headers(init.headers || {});
        h2.set("Authorization", `Bearer ${newAccess || ""}`);
        return fetch(input, { ...init, headers: h2 });
    }
    return r;
}
