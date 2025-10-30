const now = () => new Date().toISOString();
export const ROLES = ["admin", "manager", "ops", "agent", "read_only"];
export const users = {
    u1: { id: "u1", email: "admin@example.com", name: "Admin One", roles: ["admin"], active: true, createdAt: now() },
    u2: { id: "u2", email: "ops@example.com", name: "Ops User", roles: ["ops"], active: true, createdAt: now() },
    u3: { id: "u3", email: "agent@example.com", name: "Agent A", roles: ["agent"], active: true, createdAt: now() },
};
export let flags = {
    pipelineDnD: true,
    commsCenter: true,
    lendersAdmin: true,
    strictAuth: false,
};
export function listUsers() {
    return Object.values(users).sort((a, b) => a.email.localeCompare(b.email));
}
export function createUser(data) {
    const id = `u${Date.now()}`;
    const user = {
        id,
        email: String(data.email || "").toLowerCase(),
        name: String(data.name || ""),
        roles: Array.isArray(data.roles) && data.roles.length ? data.roles : ["read_only"],
        active: data.active !== false,
        createdAt: now(),
    };
    users[id] = user;
    return user;
}
export function updateUser(id, patch) {
    const u = users[id];
    if (!u)
        return null;
    if (typeof patch.email === "string")
        u.email = patch.email.toLowerCase();
    if (typeof patch.name === "string")
        u.name = patch.name;
    if (Array.isArray(patch.roles))
        u.roles = patch.roles;
    if (typeof patch.active === "boolean")
        u.active = patch.active;
    return u;
}
export function removeUser(id) {
    if (!users[id])
        return false;
    delete users[id];
    return true;
}
