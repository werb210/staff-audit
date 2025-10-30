import crypto from "crypto";
const _users = new Map();
const _tokens = new Map();
const sha = (s) => crypto.createHmac("sha256", process.env.HASH_SECRET || "h").update(s).digest("hex");
export const usersDb = {
    list() { return Array.from(_users.values()); },
    getByEmail(email) { return Array.from(_users.values()).find(u => u.email.toLowerCase() === email.toLowerCase()) || null; },
    get(id) { return _users.get(id) || null; },
    create(u) { _users.set(u.id, u); return u; },
    update(id, patch) { const u = _users.get(id); if (!u)
        return null; const n = { ...u, ...patch }; _users.set(id, n); return n; },
    setPassword(id, pw) { const u = _users.get(id); if (!u)
        return null; u.pwHash = sha(pw); _users.set(id, u); return true; },
    verify(email, pw) { const u = this.getByEmail(email); return u && u.pwHash === sha(pw) ? u : null; },
    tokenCreate(t) { _tokens.set(t.id, t); return t; },
    tokenUse(id) { const t = _tokens.get(id); if (!t || t.used || Date.now() > t.expiresAt)
        return null; t.used = true; _tokens.set(id, t); return t; }
};
// seed an admin for safety
if (!usersDb.getByEmail("staff@boreal.financial"))
    usersDb.create({ id: "u-admin", email: "staff@boreal.financial", name: "Admin", role: "admin", active: true });
