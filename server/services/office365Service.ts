// server/services/office365Service.ts
// Unified Office 365 / Microsoft Graph service (delegated flow)

import "isomorphic-fetch";
import { Client } from "@microsoft/microsoft-graph-client";
import {
  ConfidentialClientApplication,
  LogLevel,
  AccountInfo,
} from "@azure/msal-node";

type Nullable<T> = T | null | undefined;

export type O365SendMailInput = {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
};

export type O365EventTime = {
  dateTime: string; // ISO
  timeZone?: string; // e.g., "UTC"
};

export type O365EventInput = {
  subject: string;
  body?: { contentType?: "HTML" | "Text"; content?: string };
  start: O365EventTime;
  end: O365EventTime;
  attendees?: { emailAddress: { address: string; name?: string }; type?: "required" | "optional" }[];
  location?: { displayName: string };
};

export type O365Status = {
  ok: boolean;
  connected: boolean;
  user?: { id?: string; upn?: string; name?: string };
  message?: string;
};

export interface TokenStore {
  get(userId: string): Promise<AccountInfo | undefined>;
  set(userId: string, account: AccountInfo): Promise<void>;
  del(userId: string): Promise<void>;
}

// -----------------------------------------------------------------------------
// Env + config
// -----------------------------------------------------------------------------

const O365_CLIENT_ID = process.env.O365_CLIENT_ID || process.env.AZURE_AD_CLIENT_ID;
const O365_CLIENT_SECRET = process.env.O365_CLIENT_SECRET || process.env.AZURE_AD_CLIENT_SECRET;
const O365_TENANT_ID = process.env.O365_TENANT_ID || process.env.AZURE_AD_TENANT_ID || "common";
const O365_REDIRECT_URI = process.env.O365_REDIRECT_URI || process.env.OAUTH_REDIRECT_URI || "http://localhost:5000/api/o365/callback";

const DEFAULT_SCOPES = [
  "offline_access",
  "openid",
  "profile",
  "email",
  "https://graph.microsoft.com/User.Read",
  "https://graph.microsoft.com/Mail.ReadWrite",
  "https://graph.microsoft.com/Mail.Send",
  "https://graph.microsoft.com/Contacts.Read",
  "https://graph.microsoft.com/Calendars.ReadWrite",
];

const SCOPES =
  (process.env.O365_SCOPES || "")
    .split(/[\s,]+/)
    .filter(Boolean).length
    ? (process.env.O365_SCOPES as string).split(/[\s,]+/).filter(Boolean)
    : DEFAULT_SCOPES;

export function hasCredentials() {
  return !!(O365_CLIENT_ID && O365_CLIENT_SECRET && O365_TENANT_ID);
}

// -----------------------------------------------------------------------------
// MSAL + storage
// -----------------------------------------------------------------------------

class MemoryTokenStore implements TokenStore {
  private m = new Map<string, AccountInfo>();
  async get(userId: string) { return this.m.get(userId); }
  async set(userId: string, account: AccountInfo) { this.m.set(userId, account); }
  async del(userId: string) { this.m.delete(userId); }
}
let tokenStore: TokenStore = new MemoryTokenStore();
export function useTokenStore(store: TokenStore) { tokenStore = store; }

const msal = new ConfidentialClientApplication({
  auth: {
    clientId: O365_CLIENT_ID!,
    authority: `https://login.microsoftonline.com/${O365_TENANT_ID}`,
    clientSecret: O365_CLIENT_SECRET!,
  },
  system: { loggerOptions: { loggerCallback: () => {}, piiLoggingEnabled: false, logLevel: LogLevel.Warning } },
});

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

async function getAccessTokenFor(userId: string): Promise<string> {
  const account = await tokenStore.get(userId);
  if (!account) throw new Error("No Office365 account bound to this user.");
  const result = await msal.acquireTokenSilent({ account, scopes: SCOPES });
  if (!result?.accessToken) throw new Error("Failed to acquire access token silently.");
  return result.accessToken;
}

function graphClientWith(token: string) {
  return Client.init({
    authProvider: { getAccessToken: async () => token } as any,
  });
}

function normalizeArray<T>(v: T | T[]): T[] {
  return Array.isArray(v) ? v : [v];
}

// -----------------------------------------------------------------------------
// Public API
// -----------------------------------------------------------------------------

async function getAuthUrl(state: string) {
  return msal.getAuthCodeUrl({
    scopes: SCOPES,
    redirectUri: O365_REDIRECT_URI,
    state,
    prompt: "select_account",
  });
}

async function exchangeCodeForToken(params: { code: string; userId: string; redirectUri?: string }) {
  const { code, userId, redirectUri } = params;
  const result = await msal.acquireTokenByCode({
    code,
    scopes: SCOPES,
    redirectUri: redirectUri || O365_REDIRECT_URI,
  });
  if (!result?.account) throw new Error("Auth code exchange returned no account.");
  await tokenStore.set(userId, result.account);
  return {
    ok: true,
    account: { id: result.account.homeAccountId, upn: result.account.username, name: (result.account as any).name },
  };
}

async function revoke(userId: string) {
  const acc = await tokenStore.get(userId);
  if (acc) await tokenStore.del(userId);
  return { ok: true };
}

async function status(userId: string): Promise<O365Status> {
  try {
    const token = await getAccessTokenFor(userId);
    const graph = graphClientWith(token);
    const me = await graph.api("/me").get();
    return { ok: true, connected: true, user: { id: me?.id, upn: me?.userPrincipalName, name: me?.displayName } };
  } catch (e: any) {
    return { ok: true, connected: false, message: e?.message || "Not connected" };
  }
}

// ---- Mail

async function sendMail(userId: string, input: O365SendMailInput) {
  const token = await getAccessTokenFor(userId);
  const graph = graphClientWith(token);
  const to = normalizeArray(input.to).map(address => ({ emailAddress: { address } }));
  const body =
    input.html ? { contentType: "HTML", content: input.html } :
    input.text ? { contentType: "Text", content: input.text } :
    { contentType: "Text", content: "" };
  await graph.api("/me/sendMail").post({ message: { subject: input.subject, body, toRecipients: to }, saveToSentItems: true });
  return { ok: true };
}

async function listMessages(userId: string, top = 25) {
  const token = await getAccessTokenFor(userId);
  const graph = graphClientWith(token);
  const res = await graph.api("/me/messages")
    .select("id,subject,from,receivedDateTime,hasAttachments,isRead")
    .orderby("receivedDateTime DESC")
    .top(Math.min(Math.max(top, 1), 50))
    .get();
  return { ok: true, value: res?.value || [] };
}

// ---- Contacts

async function listContacts(userId: string, top = 50) {
  const token = await getAccessTokenFor(userId);
  const graph = graphClientWith(token);
  const res = await graph.api("/me/contacts")
    .select("id,displayName,emailAddresses,companyName,businessPhones")
    .top(Math.min(Math.max(top, 1), 100))
    .get();
  return { ok: true, value: res?.value || [] };
}

// ---- Calendar

async function listEvents(userId: string, range?: { start?: string; end?: string }, top = 50) {
  const token = await getAccessTokenFor(userId);
  const graph = graphClientWith(token);

  let req = graph.api("/me/events")
    .select("id,subject,organizer,start,end,location")
    .orderby("start/dateTime DESC")
    .top(Math.min(Math.max(top, 1), 100));

  if (range?.start && range?.end) {
    req = graph.api(`/me/calendarView`)
      .query({ startDateTime: range.start, endDateTime: range.end })
      .select("id,subject,organizer,start,end,location")
      .orderby("start/dateTime DESC")
      .top(Math.min(Math.max(top, 1), 100));
  }

  const res = await req.get();
  return { ok: true, value: res?.value || [] };
}

async function createEvent(userId: string, input: O365EventInput) {
  const token = await getAccessTokenFor(userId);
  const graph = graphClientWith(token);
  const evt = {
    subject: input.subject,
    body: input.body ?? { contentType: "HTML", content: "" },
    start: { dateTime: input.start.dateTime, timeZone: input.start.timeZone || "UTC" },
    end: { dateTime: input.end.dateTime, timeZone: input.end.timeZone || "UTC" },
    attendees: (input.attendees || []).map(a => ({ emailAddress: a.emailAddress, type: a.type || "required" })),
    location: input.location,
  };
  const created = await graph.api("/me/events").post(evt);
  return { ok: true, event: created };
}

// -----------------------------------------------------------------------------
// Export
// -----------------------------------------------------------------------------

export const office365Service = {
  hasCredentials,
  getAuthUrl,
  exchangeCodeForToken,
  revoke,
  status,
  sendMail,
  listMessages,
  listContacts,
  listEvents,
  createEvent,
  _useTokenStore: useTokenStore,
};

export default office365Service;
