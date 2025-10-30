export function mustHaveHumanApproval() {
    return String(process.env.REQUIRE_HUMAN_OK_FOR_CONTACT || "true") === "true";
}
export function assertHumanOKOrThrow(origin) {
    if (mustHaveHumanApproval()) {
        const e = new Error(`blocked_by_guardrail: human approval required for client contact (${origin})`);
        e.status = 403;
        throw e;
    }
}
