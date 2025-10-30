import { Client } from "@microsoft/microsoft-graph-client";
import "isomorphic-fetch";
// Environment variables
const { MS_TENANT_ID, MS_CLIENT_ID, MS_CLIENT_SECRET, MS_REDIRECT_URI, MS_SCOPES = "email,Mail.ReadWrite,Mail.Send,Calendars.ReadWrite,Contacts.ReadWrite,Tasks.ReadWrite,Files.ReadWrite,Teams.ReadBasic.All,Chat.ReadWrite,Presence.Read,Presence.Read.All", } = process.env;
// TODO: Replace with actual database calls using your ORM
async function getTokens(userId) {
    // Placeholder: select from o365_tokens where user_id = userId
    console.log(`[O365] Getting tokens for user ${userId} - TODO: implement DB call`);
    return null;
}
async function saveTokens(userId, tokens) {
    // Placeholder: upsert into o365_tokens
    console.log(`[O365] Saving tokens for user ${userId} - TODO: implement DB call`);
}
async function refreshAccessToken(userId) {
    // Placeholder: use refresh_token to get new access_token via OAuth
    console.log(`[O365] Refreshing tokens for user ${userId} - TODO: implement OAuth refresh`);
    throw new Error("Token refresh not implemented");
}
export async function graphForUser(userId) {
    let tokens = await getTokens(userId);
    if (!tokens) {
        throw new Error("No Office 365 tokens; user must connect O365");
    }
    if (new Date(tokens.expires_at) <= new Date()) {
        tokens = await refreshAccessToken(userId);
    }
    const client = Client.init({
        authProvider: async (done) => done(null, tokens.access_token),
    });
    return client;
}
export async function logGraph(userId, action, target, ok = true, error) {
    try {
        const logEntry = {
            userId,
            action,
            target,
            ok,
            error,
            timestamp: new Date().toISOString()
        };
        console.log(`[GRAPH-LOG]`, logEntry);
        // TODO: Insert into graph_audit_logs table
        // await db.insert(graphAuditLogs).values({
        //   userId,
        //   action,
        //   target,
        //   ok,
        //   error,
        //   at: new Date()
        // });
    }
    catch (logError) {
        console.error("[GRAPH-LOG] Failed to log action:", logError);
    }
}
export function getAuthUrl() {
    if (!MS_TENANT_ID || !MS_CLIENT_ID) {
        throw new Error("MS_TENANT_ID and MS_CLIENT_ID required for Office 365 integration");
    }
    const baseUrl = `https://login.microsoftonline.com/${MS_TENANT_ID}/oauth2/v2.0/authorize`;
    const params = new URLSearchParams({
        client_id: MS_CLIENT_ID,
        response_type: "code",
        redirect_uri: MS_REDIRECT_URI || "https://staff.boreal.financial/api/o365/auth/callback",
        scope: MS_SCOPES,
        response_mode: "query",
        state: "office365_connect"
    });
    return `${baseUrl}?${params.toString()}`;
}
export async function exchangeCodeForTokens(code) {
    if (!MS_TENANT_ID || !MS_CLIENT_ID || !MS_CLIENT_SECRET) {
        throw new Error("Microsoft Graph credentials not configured");
    }
    const tokenUrl = `https://login.microsoftonline.com/${MS_TENANT_ID}/oauth2/v2.0/token`;
    const body = new URLSearchParams({
        client_id: MS_CLIENT_ID,
        client_secret: MS_CLIENT_SECRET,
        code,
        redirect_uri: MS_REDIRECT_URI || "https://staff.boreal.financial/api/o365/auth/callback",
        grant_type: "authorization_code",
        scope: MS_SCOPES
    });
    const response = await fetch(tokenUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString()
    });
    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Token exchange failed: ${error}`);
    }
    const data = await response.json();
    const expiresAt = new Date(Date.now() + (data.expires_in * 1000));
    return {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_at: expiresAt
    };
}
