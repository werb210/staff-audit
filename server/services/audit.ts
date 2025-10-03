type AuditEvent = {
  at: string;
  actor?: string;
  action: string;
  details?: any;
};

const _events: AuditEvent[] = [];

export const audit = {
  log(ev: Omit<AuditEvent,"at">){ 
    _events.push({ at: new Date().toISOString(), ...ev }); 
    console.log(`[AUDIT] ${ev.action}`, { actor: ev.actor, details: ev.details });
  },
  recent(limit=200){ return _events.slice(-limit); }
};