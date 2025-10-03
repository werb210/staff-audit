import { ConfidentialClientApplication, Configuration } from "@azure/msal-node";

const cfg: Configuration = {
  auth: {
    clientId: process.env.AZURE_CLIENT_ID || "",
    authority: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}`,
    clientSecret: process.env.AZURE_CLIENT_SECRET || "",
  }
};
const cca = new ConfidentialClientApplication(cfg);

// get app token (client credentials) for application permissions fallback
export async function getAppToken(scope: string="https://graph.microsoft.com/.default"){
  const res = await cca.acquireTokenByClientCredential({ scopes: [scope] });
  if(!res?.accessToken) throw new Error("GRAPH_APP_TOKEN_FAILED");
  return res.accessToken;
}

async function graphFetch(path: string, init: any, token: string){
  const url = path.startsWith("http") ? path : `https://graph.microsoft.com/v1.0${path}`;
  const headers = { "Content-Type":"application/json", "Authorization":`Bearer ${token}`, ...(init?.headers||{}) };
  const res = await fetch(url, { ...init, headers });
  const txt = await res.text();
  let data: any = {};
  try { data = txt? JSON.parse(txt) : {}; } catch { data = { raw: txt }; }
  if(!res.ok) throw new Error(`GRAPH ${init?.method||"GET"} ${url} -> ${res.status}: ${txt}`);
  return data;
}

export async function sendMail({userAccessToken, fromUserPrincipal, to, subject, html, cc=[], bcc=[], attachments=[]}:{userAccessToken?:string; fromUserPrincipal?:string; to:string[]; subject:string; html:string; cc?:string[]; bcc?:string[]; attachments?: any[];}){
  const token = userAccessToken || await getAppToken();
  const msg = {
    message: {
      subject,
      body: { contentType:"HTML", content: html },
      toRecipients: to.map(a=>({ emailAddress:{ address:a }})),
      ccRecipients: (cc||[]).map(a=>({ emailAddress:{ address:a }})),
      bccRecipients: (bcc||[]).map(a=>({ emailAddress:{ address:a }})),
      attachments: attachments
    },
    saveToSentItems: true
  };
  const base = fromUserPrincipal? `/users/${encodeURIComponent(fromUserPrincipal)}` : `/me`;
  await graphFetch(`${base}/sendMail`, { method:"POST", body: JSON.stringify(msg) }, token);
  return { ok:true };
}

export async function createEvent({ userAccessToken, subject, startISO, endISO, attendees=[], isTeams=true, bodyHTML="" }:{
  userAccessToken?:string; subject:string; startISO:string; endISO:string; attendees:{address:string; type?:string}[]; isTeams?:boolean; bodyHTML?:string;
}){
  const token = userAccessToken || await getAppToken();
  const ev = {
    subject,
    body: { contentType:"HTML", content: bodyHTML || "" },
    start: { dateTime: startISO, timeZone: "UTC" },
    end:   { dateTime: endISO,   timeZone: "UTC" },
    attendees: attendees.map(a=>({ emailAddress:{ address:a.address }, type: a.type || "required" })),
    isOnlineMeeting: !!isTeams,
    onlineMeetingProvider: isTeams? "teamsForBusiness" : "unknown"
  };
  const data = await graphFetch(`/me/events`, { method:"POST", body: JSON.stringify(ev) }, token);
  return { id: data?.id, joinUrl: data?.onlineMeeting?.joinUrl || data?.onlineMeeting?.conferenceId || null };
}

// naive availability: returns next 3 30-min slots on the half hour starting +60 minutes from now (UTC).
// If you later want true free/busy, swap to /me/calendar/getSchedule.
export function proposeSimpleTimes(count=3){
  const now = new Date();
  now.setUTCMinutes( now.getUTCMinutes() + (60 - (now.getUTCMinutes()%30)) ); // next half-hour +1h buffer
  const slots:string[] = [];
  for(let i=0;i<count;i++){
    const s = new Date(now.getTime() + i*45*60000); // 45-min spacing
    const e = new Date(s.getTime() + 30*60000);
    slots.push(`${s.toISOString()}|${e.toISOString()}`);
  }
  return slots;
}