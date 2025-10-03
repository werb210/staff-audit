"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = requireAuth;
exports.signToken = signToken;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";
function readToken(req) {
    const h = req.headers.authorization;
    if (h && /^Bearer\s+/i.test(h))
        return h.replace(/^Bearer\s+/i, "");
    const cookie = req.headers.cookie || "";
    const m = cookie.match(/(?:^|;\s*)auth_token=([^;]+)/);
    return m ? decodeURIComponent(m[1]) : null;
}
function requireAuth(req, res, next) {
    const tok = readToken(req);
    if (!tok)
        return res.status(401).json({ ok: false, error: "missing_token" });
    try {
        const p = jsonwebtoken_1.default.verify(tok, JWT_SECRET);
        req.user = { id: p.sub || p.id, roles: p.roles || [] };
        next();
    }
    catch {
        res.status(401).json({ ok: false, error: "invalid_token" });
    }
}
function signToken(user) {
    return jsonwebtoken_1.default.sign({ sub: user.id, roles: user.roles }, JWT_SECRET, { expiresIn: "7d" });
}
