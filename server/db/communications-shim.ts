export const communications = {
  async getThreads({ types, q, limit, cursor }:{
    types: string[], q?: string, limit: number, cursor: string|null
  }) {
    // Return a tiny fake list just to validate the UI wiring.
    return {
      items: [
        { contactId: "demo-1", name: "Demo Contact", company: "Acme Co", lastActivity: new Date().toISOString(), lastSnippet: "Hello from SMS…", toPhone: "+15551234567", toEmail: "demo@acme.co" },
        { contactId: "demo-2", name: "Jane Doe", company: "Example Corp", lastActivity: new Date(Date.now() - 1800000).toISOString(), lastSnippet: "Thanks for the update", toPhone: "+15559876543", toEmail: "jane@example.com" },
        { contactId: "demo-3", name: "John Smith", company: "ABC Inc", lastActivity: new Date(Date.now() - 3600000).toISOString(), lastSnippet: "Please call me back", toPhone: "+15555555555", toEmail: "john@abc.inc" }
      ],
      nextCursor: null
    };
  },
  async getMessages({ contactId, types, limit, before, after }:{
    contactId: string, types: string[], limit: number, before?: string, after?: string
  }) {
    return [
      { id: "m1", type: "sms", direction: "inbound", at: new Date(Date.now()-3600000).toISOString(), text: "Hi there" },
      { id: "m2", type: "sms", direction: "outbound", at: new Date(Date.now()-1800000).toISOString(), text: "Thanks for reaching out!" },
      { id: "m3", type: "email", direction: "outbound", at: new Date(Date.now()-900000).toISOString(), text: "Follow-up email with details", subject: "Your Application Status" },
      { id: "m4", type: "call", direction: "outbound", at: new Date(Date.now()-600000).toISOString(), text: "Outbound call to +15551234567" },
      { id: "m5", type: "sms", direction: "inbound", at: new Date().toISOString(), text: "Got it, thanks!" }
    ];
  },
  async appendMessage({ contactId, type, direction, at, payload, text, subject }:{
    contactId: string; type: "sms"|"email"|"call"; direction: "inbound"|"outbound";
    at: string; payload?: any; text?: string; subject?: string;
  }) {
    // No DB write here; return a fake persisted record to keep UI flowing.
    return { id: `stub-${type}-${Date.now()}`, contactId, at, direction, text, subject };
  },
};

export const templates = {
  async getTemplates({ kind }:{ kind?: "sms"|"email" }) {
    const all = [
      { id: "t1", kind: "sms", name: "Doc Rejected", body: "We reviewed your documents and need additional information. Please call us at (825) 451-1768." },
      { id: "t2", kind: "email", name: "Welcome", subject: "Welcome to Boreal Financial", body: "Thanks for applying with Boreal Financial. We're reviewing your application and will be in touch soon." },
      { id: "t3", kind: "sms", name: "Follow Up", body: "Just checking in on your application status. Any questions? Call us at (825) 451-1768." },
      { id: "t4", kind: "email", name: "Document Request", subject: "Additional Documents Needed", body: "Please provide the following documents to complete your application: bank statements, proof of income, and ID verification." },
      { id: "t5", kind: "sms", name: "Application Approved", body: "Congratulations! Your application has been approved. Please call (825) 451-1768 to finalize next steps." },
      { id: "t6", kind: "email", name: "Status Update", subject: "Application Status Update", body: "Your application is progressing well. We'll contact you within 24-48 hours with next steps." }
    ];
    return kind ? all.filter(x => x.kind === kind) : all;
  }
};