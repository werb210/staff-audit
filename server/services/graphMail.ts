import fetch from "node-fetch";

const BASE = process.env.MSFT_GRAPH_BASE || "https://graph.microsoft.com/v1.0";

export async function graphSendMail(accessToken: string, to: string, subject: string, html: string) {
  const r = await fetch(`${BASE}/me/sendMail`, {
    method: "POST",
    headers: { 
      Authorization: `Bearer ${accessToken}`, 
      "Content-Type": "application/json" 
    },
    body: JSON.stringify({ 
      message: { 
        subject, 
        body: { contentType: "html", content: html }, 
        toRecipients: [{ emailAddress: { address: to } }]
      }, 
      saveToSentItems: "true" 
    })
  });
  if (!r.ok) { 
    throw new Error(`Graph sendMail ${r.status}: ${await r.text()}`); 
  }
}

export async function graphCreateTask(accessToken: string, title: string, bodyHtml?: string) {
  // Create in default To Do list
  const listRsp = await fetch(`${BASE}/me/todo/lists`, { 
    headers: { Authorization: `Bearer ${accessToken}` } 
  });
  const lists = await listRsp.json(); 
  const listId = lists?.value?.[0]?.id;
  if (!listId) throw new Error("No To Do list available");
  
  const r = await fetch(`${BASE}/me/todo/lists/${listId}/tasks`, {
    method: "POST",
    headers: { 
      Authorization: `Bearer ${accessToken}`, 
      "Content-Type": "application/json" 
    },
    body: JSON.stringify({ 
      title, 
      body: { content: bodyHtml || "", contentType: "html" } 
    })
  });
  if (!r.ok) { 
    throw new Error(`Graph task ${r.status}: ${await r.text()}`); 
  }
  return r.json();
}