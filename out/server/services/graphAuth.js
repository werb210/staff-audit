import { ConfidentialClientApplication } from "@azure/msal-node";
import { db } from "../db";
import { graphTokens } from "../db/schema/graphTokens";
import { eq } from "drizzle-orm";
const config = {
    auth: {
        clientId: process.env.O365_CLIENT_ID,
        authority: `https://login.microsoftonline.com/${process.env.O365_TENANT_ID}`,
        clientSecret: process.env.O365_CLIENT_SECRET,
    },
};
const msal = new ConfidentialClientApplication(config);
export async function saveTokens(userId, accessToken, refreshToken, expiresOn, scope) {
    const rows = await db.select().from(graphTokens).where(eq(graphTokens.userId, userId));
    if (rows.length) {
        await db.update(graphTokens).set({
            accessToken, refreshToken: refreshToken ?? rows[0].refreshToken, expiresAt: expiresOn, scope
        }).where(eq(graphTokens.userId, userId));
    }
    else {
        await db.insert(graphTokens).values({ userId, accessToken, refreshToken, expiresAt: expiresOn, scope });
    }
}
export async function getValidAccessToken(userId) {
    const rows = await db.select().from(graphTokens).where(eq(graphTokens.userId, userId));
    const row = rows[0];
    if (!row)
        throw new Error("No Graph tokens for user");
    const exp = row.expiresAt ? new Date(row.expiresAt) : new Date(Date.now() - 1000);
    if (exp.getTime() - Date.now() < 120000) {
        if (!row.refreshToken)
            throw new Error("No refresh token available");
        const result = await msal.acquireTokenByRefreshToken({
            refreshToken: row.refreshToken,
            scopes: (process.env.O365_SCOPES || "").split(" ").filter(Boolean),
        });
        if (!result?.accessToken)
            throw new Error("Refresh failed");
        const expiresOn = result.expiresOn ?? new Date(Date.now() + 55 * 60 * 1000);
        await saveTokens(userId, result.accessToken, result.refreshToken, expiresOn, (result.scopes || []).join(" "));
        return result.accessToken;
    }
    return row.accessToken || "";
}
export { msal };
