import { Router } from "express";
import fetch from "node-fetch";
import { getToken } from "../services/graph";
import { requireAuth } from "../auth/verifyOnly";
const r = Router(); r.use(requireAuth);

async function graph(token:string, path:string, init:any={}){
  const rsp = await fetch(`https://graph.microsoft.com/v1.0${path}`, { ...init, headers: { Authorization:`Bearer ${token}`, "Content-Type":"application/json" }});
  const j = await rsp.json(); if (!rsp.ok) throw new Error(j?.error?.message||"graph_error"); return j;
}

r.get("/o365/todo", async (req:any,res)=>{
  const token = await getToken(process.env.O365_SERVICE_USER_ID!);
  const list = await graph(token, `/me/todo/lists`);
  const defaultListId = list?.value?.[0]?.id;
  const tasks = defaultListId ? await graph(token, `/me/todo/lists/${defaultListId}/tasks`) : { value:[] };
  res.json({ ok:true, items: tasks.value||[] });
});

r.post("/o365/todo", async (req:any,res)=>{
  const token = await getToken(process.env.O365_SERVICE_USER_ID!);
  const list = await graph(token, `/me/todo/lists`);
  const defaultListId = list?.value?.[0]?.id;
  if (!defaultListId) return res.status(400).json({ error:"no_default_list" });
  const { title, dueDateTime } = req.body;
  const task = await graph(token, `/me/todo/lists/${defaultListId}/tasks`, {
    method:"POST",
    body: JSON.stringify({ title, dueDateTime: dueDateTime ? { dateTime: dueDateTime, timeZone:"UTC" } : undefined })
  });
  res.json({ ok:true, task });
});

r.patch("/o365/todo/:taskId", async (req:any,res)=>{
  const token = await getToken(process.env.O365_SERVICE_USER_ID!);
  const list = await graph(token, `/me/todo/lists`);
  const defaultListId = list?.value?.[0]?.id;
  if (!defaultListId) return res.status(400).json({ error:"no_default_list" });
  const { status, title } = req.body;
  const task = await graph(token, `/me/todo/lists/${defaultListId}/tasks/${req.params.taskId}`, {
    method:"PATCH",
    body: JSON.stringify({ status, title })
  });
  res.json({ ok:true, task });
});

export default r;