import { db } from '../db';
import { eq } from 'drizzle-orm';
import { passkeys } from '../../shared/schema';
/**
 * Passkeys are DISABLED by policy. This service is intentionally inert.
 * Do not re-enable without explicit instruction from ChatGPT.
 */
export const Passkeys = {
    async listByUserId(userId) {
        throw new Error('Passkeys disabled by policy');
    },
    async insert(p) {
        try {
            await db.insert(passkeys).values({
                userId: p.userId,
                credId: p.credId,
                publicKey: p.publicKey,
                counter: p.counter,
                deviceType: p.deviceType,
                backedUp: p.backedUp,
                transports: p.transports ? JSON.stringify(p.transports) : null,
                label: p.label || 'Passkey',
                createdAt: p.createdAt,
                lastUsedAt: p.lastUsedAt
            });
        }
        catch (error) {
            console.error('Error inserting passkey:', error);
            throw error;
        }
    },
    async getByCredId(credId) {
        try {
            const results = await db.select().from(passkeys).where(eq(passkeys.credId, credId));
            if (results.length === 0)
                return null;
            const row = results[0];
            return {
                id: row.id,
                userId: row.userId,
                credId: row.credId,
                publicKey: row.publicKey,
                counter: row.counter,
                deviceType: row.deviceType || undefined,
                backedUp: row.backedUp || undefined,
                transports: row.transports ? JSON.parse(row.transports) : undefined,
                label: row.label || 'Passkey',
                createdAt: row.createdAt,
                lastUsedAt: row.lastUsedAt
            };
        }
        catch (error) {
            console.error('Error fetching passkey by credId:', error);
            return null;
        }
    },
    async updateCounter(id, counter) {
        try {
            await db.update(passkeys)
                .set({
                counter,
                lastUsedAt: new Date()
            })
                .where(eq(passkeys.id, id));
        }
        catch (error) {
            console.error('Error updating passkey counter:', error);
            throw error;
        }
    },
    async delete(id) {
        try {
            await db.delete(passkeys).where(eq(passkeys.id, id));
        }
        catch (error) {
            console.error('Error deleting passkey:', error);
            throw error;
        }
    },
};
