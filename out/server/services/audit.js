const _events = [];
export const audit = {
    log(ev) {
        _events.push({ at: new Date().toISOString(), ...ev });
        console.log(`[AUDIT] ${ev.action}`, { actor: ev.actor, details: ev.details });
    },
    recent(limit = 200) { return _events.slice(-limit); }
};
