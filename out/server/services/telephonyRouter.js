import { findContactAcrossTenants, routeCallToTenant, routeSmsToTenant } from './multiTenantComms';
import { audit } from './audit';
// Global telephony ingress with tenant-local persistence
export class TelephonyRouter {
    io;
    constructor(io) {
        this.io = io;
    }
    // Handle incoming call webhook
    async handleIncomingCall(fromNumber, toNumber, callSid) {
        try {
            // Find contacts across both tenants
            const contacts = await findContactAcrossTenants(fromNumber, null); // TODO: Pass real DB
            const targetTenant = routeCallToTenant(fromNumber, toNumber);
            // Broadcast ring event to ALL connected clients across tenants
            this.io.emit('incoming_call', {
                callSid,
                fromNumber,
                toNumber,
                contacts, // Array with tenant info
                targetTenant,
                timestamp: new Date().toISOString()
            });
            console.log(`[TELEPHONY] Incoming call ${callSid} from ${fromNumber} - broadcasting to all tenants`);
            // Do NOT create activity record yet - wait for answer
            return { success: true, contacts, targetTenant };
        }
        catch (error) {
            console.error('[TELEPHONY] Incoming call error:', error);
            return { success: false, error };
        }
    }
    // Handle call answered by specific tenant
    async handleCallAnswered(callSid, answeredByTenant, answeredByUser, contactId) {
        try {
            // Create activity record ONLY in the tenant that answered
            const activity = {
                id: `call-${callSid}`,
                tenant_id: answeredByTenant,
                contact_id: contactId,
                type: 'call',
                direction: 'inbound',
                status: 'answered',
                summary: `Inbound call answered by ${answeredByUser}`,
                metadata: { callSid, answeredByUser },
                createdAt: new Date().toISOString(),
                actor_user_id: answeredByUser
            };
            // TODO: Save to database with tenant isolation
            console.log(`[TELEPHONY] Call ${callSid} answered by ${answeredByTenant} tenant:`, activity);
            // Audit logging
            audit.log({
                actor: answeredByUser,
                action: 'telephony:call_answered',
                details: { callSid, tenant: answeredByTenant, contactId }
            });
            // Notify all clients that call was answered
            this.io.emit('call_answered', {
                callSid,
                answeredByTenant,
                answeredByUser,
                contactId,
                timestamp: new Date().toISOString()
            });
            return { success: true, activity };
        }
        catch (error) {
            console.error('[TELEPHONY] Call answered error:', error);
            return { success: false, error };
        }
    }
    // Handle incoming SMS
    async handleIncomingSms(fromNumber, toNumber, body, messageSid) {
        try {
            // Find contacts across tenants
            const contacts = await findContactAcrossTenants(fromNumber, null);
            const targetTenant = routeSmsToTenant(fromNumber, toNumber);
            // If contact found in specific tenant, save activity there
            const tenantContact = contacts.find(c => c.tenant === targetTenant);
            if (tenantContact) {
                const activity = {
                    id: `sms-${messageSid}`,
                    tenant_id: targetTenant,
                    contact_id: tenantContact.id,
                    type: 'sms',
                    direction: 'inbound',
                    status: 'received',
                    summary: body,
                    metadata: { messageSid, fromNumber, toNumber },
                    createdAt: new Date().toISOString()
                };
                // TODO: Save to database
                console.log(`[TELEPHONY] SMS ${messageSid} saved to ${targetTenant} tenant:`, activity);
                // Notify relevant tenant clients
                this.io.emit(`sms_received:${targetTenant}`, {
                    messageSid,
                    fromNumber,
                    toNumber,
                    body,
                    contact: tenantContact,
                    tenant: targetTenant,
                    timestamp: new Date().toISOString()
                });
            }
            else {
                // No contact found - notify all tenants for manual routing
                this.io.emit('sms_received_unknown', {
                    messageSid,
                    fromNumber,
                    toNumber,
                    body,
                    timestamp: new Date().toISOString()
                });
            }
            return { success: true, contacts, targetTenant };
        }
        catch (error) {
            console.error('[TELEPHONY] Incoming SMS error:', error);
            return { success: false, error };
        }
    }
    // Handle outgoing call from tenant
    async handleOutgoingCall(contactId, tenant, userId, toNumber) {
        try {
            // Create activity record in originating tenant only
            const activity = {
                id: `call-out-${Date.now()}`,
                tenant_id: tenant,
                contact_id: contactId,
                type: 'call',
                direction: 'outbound',
                status: 'initiated',
                summary: `Outbound call to ${toNumber}`,
                metadata: { userId, toNumber },
                createdAt: new Date().toISOString(),
                actor_user_id: userId
            };
            // TODO: Save to database with tenant isolation
            console.log(`[TELEPHONY] Outgoing call from ${tenant} tenant:`, activity);
            // Audit logging
            audit.log({
                actor: userId,
                action: 'telephony:call_initiated',
                details: { contactId, tenant, toNumber }
            });
            return { success: true, activity };
        }
        catch (error) {
            console.error('[TELEPHONY] Outgoing call error:', error);
            return { success: false, error };
        }
    }
}
