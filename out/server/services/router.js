const _agents = new Map();
const _queues = new Map();
function now() { return Date.now(); }
export const routerStore = {
    listAgents() { return Array.from(_agents.values()); },
    upsertAgent(a) { _agents.set(a.id, a); },
    setOnline(id, online) { const a = _agents.get(id); if (a) {
        a.online = online;
        _agents.set(id, a);
    } },
    listQueues() { return Array.from(_queues.values()); },
    upsertQueue(q) { _queues.set(q.id, q); },
    nextAgentFor(queueId, requiredSkills = []) {
        const agents = Array.from(_agents.values()).filter(a => a.online);
        const skillFiltered = requiredSkills.length ? agents.filter(a => a.skills.some(s => requiredSkills.includes(s))) : agents;
        if (!skillFiltered.length)
            return null;
        // round-robin by lastAssignedAt
        skillFiltered.sort((a, b) => (a.lastAssignedAt ?? 0) - (b.lastAssignedAt ?? 0));
        const chosen = skillFiltered[0];
        chosen.lastAssignedAt = now();
        _agents.set(chosen.id, chosen);
        return chosen;
    }
};
export function isOpen(q) {
    if (!q?.hours)
        return true;
    try {
        const tz = q.hours.tz || "America/Edmonton";
        const nowDt = new Date().toLocaleString("en-CA", { timeZone: tz });
        const d = new Date(nowDt);
        const day = d.getDay(); // 0=Sun
        const hours = q.hours.days[day];
        if (!hours)
            return false;
        const [oh, om] = hours.open.split(":").map(Number);
        const [ch, cm] = hours.close.split(":").map(Number);
        const open = new Date(d);
        open.setHours(oh, om, 0, 0);
        const close = new Date(d);
        close.setHours(ch, cm, 0, 0);
        return d >= open && d <= close;
    }
    catch {
        return true;
    }
}
