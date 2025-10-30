import crypto from "crypto";
export function sha256Lower(s) {
    return crypto.createHash("sha256").update(s.trim().toLowerCase()).digest("hex");
}
export function normEmail(e) {
    if (!e)
        return null;
    const m = e.trim().toLowerCase().match(/^([^@]+)@(.+)$/);
    if (!m)
        return e.trim().toLowerCase();
    let [_, local, domain] = m;
    if (domain === "gmail.com" || domain === "googlemail.com") {
        local = local.replace(/\./g, "").split("+", 1)[0];
    }
    else {
        local = local.split("+", 1)[0];
    }
    return `${local}@${domain}`;
}
export function normPhone(p) {
    if (!p)
        return null;
    const d = p.replace(/[^\d]/g, "");
    return d.length ? d : null;
}
