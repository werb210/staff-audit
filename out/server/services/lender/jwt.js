import jwt from "jsonwebtoken";
const secret = process.env.LENDER_JWT_SECRET || "dev_lender_secret";
export function signShareToken(payload) {
    const expiresInSeconds = Math.max(60, Math.floor((payload.exp - Date.now()) / 1000));
    return jwt.sign(payload, secret, { algorithm: "HS256", expiresIn: expiresInSeconds });
}
export function verifyShareToken(token) {
    try {
        const d = jwt.verify(token, secret, { algorithms: ["HS256"] });
        return { shareId: d.shareId, applicationId: d.applicationId, partnerId: d.partnerId, perms: d.perms || [] };
    }
    catch {
        return null;
    }
}
