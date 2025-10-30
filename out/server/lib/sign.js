import crypto from "crypto";
const KEY = (process.env.SESSION_SECRET || "dev-secret").slice(0, 32).padEnd(32, "x");
export function sign(payload) {
    const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
    const mac = crypto.createHmac("sha256", KEY).update(data).digest("base64url");
    return `${data}.${mac}`;
}
export function verify(token) {
    const [data, mac] = token.split(".");
    const check = crypto.createHmac("sha256", KEY).update(data).digest("base64url");
    if (mac !== check)
        return null;
    try {
        return JSON.parse(Buffer.from(data, "base64url").toString());
    }
    catch {
        return null;
    }
}
