import fetch from "node-fetch";
const TENANT = process.env.MS_TENANT_ID;
const CLIENT_ID = process.env.MS_CLIENT_ID;
const CLIENT_SECRET = process.env.MS_CLIENT_SECRET;
export async function refreshWithRefreshToken(refresh_token) {
    const form = new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        grant_type: "refresh_token",
        refresh_token
    });
    const r = await fetch(`https://login.microsoftonline.com/${TENANT}/oauth2/v2.0/token`, {
        method: "POST",
        body: form
    });
    if (!r.ok)
        throw new Error("ms refresh fail " + r.status);
    return r.json();
}
export async function createEvent(accessToken, body) {
    const r = await fetch("https://graph.microsoft.com/v1.0/me/events", {
        method: "POST",
        headers: {
            "Authorization": "Bearer " + accessToken,
            "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
    });
    if (!r.ok)
        throw new Error("ms create event fail " + r.status + " " + await r.text());
    return r.json();
}
