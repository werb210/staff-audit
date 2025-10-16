import { TENANT_CONFIG } from '../middleware/tenant';

// Cross-tenant contact search for incoming calls/SMS
export async function findContactAcrossTenants(phoneNumber: string, db: any) {
  const results = [];
  
  // Search in BF tenant
  const bfContacts = await db.contacts?.search({ phone: phoneNumber, tenant_id: 'bf' }) || [];
  bfContacts.forEach((contact: any) => {
    results.push({ ...contact, tenant: 'bf', tenantName: 'Boreal Financial' });
  });
  
  // Search in SLF tenant  
  const slfContacts = await db.contacts?.search({ phone: phoneNumber, tenant_id: 'slf' }) || [];
  slfContacts.forEach((contact: any) => {
    results.push({ ...contact, tenant: 'slf', tenantName: 'Site Level Financial' });
  });
  
  return results;
}

// Determine outgoing caller ID based on contact tenant
export function getCallerIdForContact(contact: any) {
  const tenant = contact.tenant_id || contact.tenant || 'bf';
  return TENANT_CONFIG[tenant as keyof typeof TENANT_CONFIG]?.twilioNumberE164 || TENANT_CONFIG.bf.twilioNumberE164;
}

// Unified communication event for cross-tenant broadcasting
export function broadcastCommEvent(io: any, event: string, data: any) {
  // Broadcast to all connected clients regardless of tenant
  io.emit(event, {
    ...data,
    timestamp: new Date().toISOString(),
    crossTenant: true
  });
  
  // Also emit tenant-specific events
  if (data.tenant) {
    io.emit(`${event}:${data.tenant}`, data);
  }
}

// SMS routing logic (BF-only)
export function routeSmsToTenant(fromNumber: string, toNumber: string) {
  // BF-only telephony - always route to BF
  return 'bf';
}

// Call routing logic (BF-only)
export function routeCallToTenant(fromNumber: string, toNumber: string) {
  // BF-only telephony - always route to BF
  return 'bf';
}