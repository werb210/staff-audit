import { db } from '../db';
import { oauthTokens } from '../../shared/schema';
import { eq, and } from 'drizzle-orm';
export class TokenService {
    // Save or update a token for a user and provider
    async saveToken(userId, provider, accessToken, refreshToken, expiresAt, scope) {
        const tokenData = {
            userId,
            provider: provider, // Cast to enum
            accessToken,
            refreshToken,
            expiresAt,
            scope,
            tokenType: 'Bearer'
        };
        // Use upsert to save or update
        const [token] = await db
            .insert(oauthTokens)
            .values(tokenData)
            .onConflictDoUpdate({
            target: [oauthTokens.userId, oauthTokens.provider],
            set: {
                accessToken,
                refreshToken,
                expiresAt,
                scope,
                updatedAt: new Date()
            }
        })
            .returning();
        return token;
    }
    // Get a token for a user and provider
    async getToken(userId, provider) {
        const [token] = await db
            .select()
            .from(oauthTokens)
            .where(and(eq(oauthTokens.userId, userId), eq(oauthTokens.provider, provider)))
            .limit(1);
        return token;
    }
    // Delete a token for a user and provider
    async deleteToken(userId, provider) {
        const result = await db
            .delete(oauthTokens)
            .where(and(eq(oauthTokens.userId, userId), eq(oauthTokens.provider, provider)));
        return result.rowCount > 0;
    }
    // Get all tokens for a user
    async getUserTokens(userId) {
        return await db
            .select()
            .from(oauthTokens)
            .where(eq(oauthTokens.userId, userId));
    }
    // Check if a token is expired
    isTokenExpired(token) {
        if (!token.expiresAt)
            return false;
        return new Date() >= new Date(token.expiresAt);
    }
    // Get active (non-expired) token
    async getActiveToken(userId, provider) {
        const token = await this.getToken(userId, provider);
        if (!token || this.isTokenExpired(token)) {
            return undefined;
        }
        return token;
    }
}
export const tokenService = new TokenService();
