export function stageProb(stage) {
    const map = JSON.parse(process.env.COPILOT_STAGE_PROBS || "{}");
    return Number(map[stage] ?? 0);
}
export function takeRate() {
    return Number(process.env.COPILOT_TAKE_RATE ?? 0.08);
}
export function expectedRevenue(apps) {
    const t = takeRate();
    return apps.reduce((sum, a) => sum + (a.amountRequested || 0) * stageProb(a.status) * t, 0);
}
