export const DISABLE_EXTERNAL = String(process.env.DISABLE_EXTERNAL_CALLS || "").toLowerCase() === "true";
export function shouldSkipExternalCall() {
    return DISABLE_EXTERNAL;
}
export function logExternalCallSkip(service) {
    if (DISABLE_EXTERNAL) {
        console.log(`[SKIP] External call to ${service} disabled by DISABLE_EXTERNAL_CALLS=true`);
    }
}
