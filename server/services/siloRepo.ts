// Mock repository for SLF silo data - replace with real ORM (Drizzle/Prisma)
// Every query MUST filter by silo for data isolation

const mockData: Record<string, any[]> = {
  contacts: [
    {id: "c1", name: "Boreal Contact 1", phone: "+1111111111", email: "boreal1@test.com", silo: "BOREAL"},
    {id: "slf-c1", name: "SLF Contact 1", phone: "+1234567890", email: "slf1@test.com", silo: "SLF"}
  ],
  companies: [
    {id: "co1", name: "Boreal Company 1", silo: "BOREAL"},
    {id: "slf-co1", name: "SLF Company 1", silo: "SLF"}
  ],
  deals: [],
  smsThreads: [
    {id: "t1", contactName: "Boreal Contact", contactNumber: "+1111111111", last: "Hello from Boreal", updatedAt: "2025-08-10T15:00:00Z", silo: "BOREAL"},
    {id: "slf-t1", contactName: "SLF Contact", contactNumber: "+1234567890", last: "Hello from SLF", updatedAt: "2025-08-10T16:00:00Z", silo: "SLF"}
  ],
  smsMessages: [],
  pipeline: [
    {id: "p1", business: "Boreal Deal 1", amount: 100000, stage: "New", silo: "BOREAL"},
    {id: "slf-p1", business: "SLF Deal 1", amount: 50000, stage: "New", silo: "SLF"}
  ]
};

async function withSilo(table: string, silo: string) { 
  return (mockData[table] || []).filter((r: any) => r.silo === silo); 
}

export const siloRepo = {
  contacts: {
    async list(silo: string) { return withSilo("contacts", silo); },
    async get(silo: string, id: string) { 
      const items = await withSilo("contacts", silo);
      return items.find((r: any) => r.id === id) || null;
    },
  },
  companies: {
    async list(silo: string) { return withSilo("companies", silo); },
  },
  deals: {
    async list(silo: string) { return withSilo("deals", silo); },
  },
  messages: {
    async threads(silo: string) { return withSilo("smsThreads", silo); },
    async thread(silo: string, id: string) { 
      const all = await withSilo("smsMessages", silo); 
      return all.filter((m: any) => m.threadId === id); 
    },
  },
  pipeline: {
    async board(silo: string) { return withSilo("pipeline", silo); },
    async summary(silo: string) { 
      const rows = await withSilo("pipeline", silo); 
      const groups = rows.reduce((a: any, r: any) => {
        a[r.stage] = (a[r.stage] || 0) + 1;
        return a;
      }, {}); 
      return groups; 
    },
  },
};