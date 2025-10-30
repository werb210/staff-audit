// server/services/office365Service.ts
// Unified Microsoft 365 service used by routes/integrations/office365.ts

import { sql } from "drizzle-orm";

// ---- Env ----
const O365_CLIENT_ID = process.env.O365_CLIENT_ID || "";
const O365_CLIENT_SECRET = process.env.O365_CLIENT_SECRET || "";
const O365_TENANT_ID = process.env.O365_TENANT_ID || "common";
const O365_REDIRECT_URI = process.env.O365_REDIRECT_URI || "";
const O365_SCOPES =
  process.env.O365_SCOPES ||
  [
    "offline_access",
    "openid",
    "profile",
    "email",
    "Calendars.ReadWrite",
    "Mail.ReadWrite",
    "Mail.Send",
    "Contacts.ReadWrite",
    "User.Read",
  ].join(" ");

const AUTH_BASE = `https://login.microsoftonline.com/${O365_TENANT_ID}/oauth2/v2.0`;
const GRAPH = "https://graph.microsoft.com/v1.0";

// Node 18+ has global fetch. If not, add a polyfill in your runtime.
const now = () => Math.floor(Date.now() / 1000);

// ---- Token store: DB if available, fallback to memory ----
type TokenRow = {
  user_id: string;
  access_token: string;
  refresh_token: string;
  expires_at: number;
  scope?: string | null;
  tenant?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

const mem = new Map<string, TokenRow>();

async function getDb() {
  try {
    const { db } = await import("../db");
    return db as any;
  } catch {
    return null;
  }
}

async function readToken(userId: string): Promise<TokenRow | null> {
  const db = await getDb();
  if (db) {
    try {
      const rows = await db.execute<TokenRow>(
        sql`select user_id, access_token, refresh_token, expires_at, scope, tenant from o365_tokens where user_id=${userId} limit 1`
      );
      const r = Array.isArray(rows) ? rows[0] : (rows as any)?.rows?.[0];
      if (r) return { ...r, user_id: String(r.user_id) };
    } catch {}
  }
  return mem.get(userId) || null;
}

async function writeToken(row: TokenRow) {
  const db = await getDb();
  if (db) {
    try {
      await db.execute(
        sql`insert into o365_tokens (user_id, access_token, refresh_token, expires_at, scope, tenant, createdAt, updatedAt)
            values (${row.user_id}, ${row.access_token}, ${row.refresh_token}, ${row.expires_at}, ${row.scope || null}, ${row.tenant || null}, now(), now())
            on conflict (user_id) do update set 
              access_token=excluded.access_token,
              refresh_token=excluded.refresh_token,
              expires_at=excluded.expires_at,
              scope=excluded.scope,
              tenant=excluded.tenant,
              updatedAt=now()`
      );
    } catch {}
  }
  mem.set(row.user_id, row);
}

async function deleteToken(userId: string) {
  const db = await getDb();
  if (db) {
    try {
      await db.execute(sql`delete from o365_tokens where user_id=${userId}`);
    } catch {}
  }
  mem.delete(userId);
}

// ---- OAuth helpers ----
function hasCredentials() {
  return Boolean(O365_CLIENT_ID && O365_CLIENT_SECRET && O365_REDIRECT_URI);
}

function qs(p: Record<string, string>) {
  return new URLSearchParams(p).toString();
}

async function getAuthUrl(state: string) {
  if (!hasCredentials()) throw new Error("o365_not_configured");
  const url =
    `${AUTH_BASE}/authorize?` +
    qs({
      client_id: O365_CLIENT_ID,
      response_type: "code",
      redirect_uri: O365_REDIRECT_URI,
      response_mode: "query",
      scope: O365_SCOPES,
      state,
      prompt: "select_account",
    });
  return url;
}

type TokenResp = {
  token_type: string;
  scope: string;
  expires_in: number;
  ext_expires_in?: number;
  access_token: string;
  refresh_token: string;
  id_token?: string;
};

async function exchangeCodeForToken(args: { code: string; userId: string }) {
  const body = new URLSearchParams({
    client_id: O365_CLIENT_ID,
    client_secret: O365_CLIENT_SECRET,
    grant_type: "authorization_code",
    code: args.code,
    redirect_uri: O365_REDIRECT_URI,
  });

  const r = await fetch(`${AUTH_BASE}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!r.ok) {
    const text = await r.text();
    throw new Error(`token_exchange_failed: ${text}`);
  }

  const json = (await r.json()) as TokenResp;
  const expires_at = now() + Number(json.expires_in || 3600);

  await writeToken({
    user_id: args.userId,
    access_token: json.access_token,
    refresh_token: json.refresh_token,
    expires_at,
    scope: json.scope,
    tenant: O365_TENANT_ID,
  });

  return { ok: true, expires_at };
}

async function refreshIfNeeded(userId: string): Promise<string> {
  const row = await readToken(userId);
  if (!row) throw new Error("not_connected");

  const skew = 120; // seconds
  if (row.expires_at > now() + skew) return row.access_token;

  // refresh
  const body = new URLSearchParams({
    client_id: O365_CLIENT_ID,
    client_secret: O365_CLIENT_SECRET,
    grant_type: "refresh_token",
    refresh_token: row.refresh_token,
  });

  const r = await fetch(`${AUTH_BASE}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!r.ok) {
    // if refresh fails, drop tokens so caller can reconnect
    await deleteToken(userId);
    const text = await r.text();
    throw new Error(`refresh_failed: ${text}`);
  }
  const json = (await r.json()) as TokenResp;
  const expires_at = now() + Number(json.expires_in || 3600);

  const updated: TokenRow = {
    user_id: userId,
    access_token: json.access_token,
    refresh_token: json.refresh_token || row.refresh_token,
    expires_at,
    scope: json.scope || row.scope,
    tenant: row.tenant,
  };
  await writeToken(updated);
  return updated.access_token;
}

async function graph(userId: string, path: string, init?: RequestInit) {
  const token = await refreshIfNeeded(userId);
  const r = await fetch(`${GRAPH}${path}`, {
    ...(init || {}),
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(init?.headers || {}),
    },
  });
  if (!r.ok) {
    const text = await r.text();
    throw new Error(`graph_error ${r.status}: ${text}`);
  }
  if (r.status === 204) return null;
  return r.json();
}

// ---- Public API ----
async function status(userId: string) {
  const row = await readToken(userId);
  return {
    ok: true,
    connected: !!row,
    expires_at: row?.expires_at || null,
    scope: row?.scope || null,
    tenant: row?.tenant || O365_TENANT_ID,
    hasCredentials: hasCredentials(),
  };
}

async function listMessages(userId: string, top = 25) {
  const data = await graph(
    userId,
    `/me/messages?$top=${encodeURIComponent(String(top))}&$select=id,subject,from,receivedDateTime,isRead`
  );
  return data;
}

type SendMailInput = {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
};
async function sendMail(userId: string, input: SendMailInput) {
  const recipients = (Array.isArray(input.to) ? input.to : [input.to]).map((addr) => ({
    emailAddress: { address: addr },
  }));
  const message: any = {
    subject: input.subject,
    toRecipients: recipients,
  };
  if (input.html) {
    message.body = { contentType: "HTML", content: input.html };
  } else if (input.text) {
    message.body = { contentType: "Text", content: input.text };
  }

  await graph(userId, `/me/sendMail`, {
    method: "POST",
    body: JSON.stringify({ message, saveToSentItems: true }),
  });
  return { ok: true };
}

async function listContacts(userId: string) {
  const data = await graph(userId, `/me/contacts?$select=id,displayName,emailAddresses,companyName,mobilePhone`);
  return data;
}

async function listEvents(
  userId: string,
  range: { start?: string; end?: string } = {}
) {
  // If start/end provided use calendarView. Else events default.
  if (range.start && range.end) {
    const url =
      `/me/calendarView?startDateTime=${encodeURIComponent(range.start)}&endDateTime=${encodeURIComponent(
        range.end
      )}&$select=subject,organizer,start,end,location,id`;
    return graph(userId, url);
  }
  return graph(userId, `/me/events?$top=50&$select=subject,organizer,start,end,location,id,createdDateTime`);
}

async function createEvent(userId: string, input: any) {
  // Pass-through. The route has already validated shape.
  return graph(userId, `/me/events`, { method: "POST", body: JSON.stringify(input) });
}

async function revoke(userId: string) {
  await deleteToken(userId);
  // Microsoft Graph does not expose an access-token revoke for AAD v2.0 confidential client easily.
  // Clearing stored refresh + access tokens effectively disconnects the app for this user.
  return { ok: true };
}

export default {
  hasCredentials,
  getAuthUrl,
  exchangeCodeForToken,
  status,
  sendMail,
  listMessages,
  listContacts,
  listEvents,
  createEvent,
  revoke,
};
