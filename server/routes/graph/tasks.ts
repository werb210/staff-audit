import { Router } from "express";
import { Client } from "@microsoft/microsoft-graph-client";
import { getValidAccessToken } from "../../services/graphAuth";

const router = Router();

router.get("/list", async (req: any, res: any) => {
  const userId = req.user?.id || req.session?.user?.id;
  if (!userId) return res.status(401).json({ error: "No session" });
  const token = await getValidAccessToken(userId);
  const client = Client.init({ authProvider: (done)=>done(null, token) });
  
  // Get task lists first
  const taskLists = await client.api("/me/todo/lists").get();
  let allTasks: any[] = [];
  
  for (const list of taskLists.value || []) {
    const tasks = await client.api(`/me/todo/lists/${list.id}/tasks`).get();
    allTasks = allTasks.concat((tasks.value || []).map((t: any) => ({ ...t, listName: list.displayName })));
  }
  
  res.json(allTasks);
});

router.post("/create", async (req: any, res: any) => {
  const { title, body, dueISO } = req.body || {};
  const userId = req.user?.id || req.session?.user?.id;
  if (!userId) return res.status(401).json({ error: "No session" });
  const token = await getValidAccessToken(userId);
  const client = Client.init({ authProvider: (done)=>done(null, token) });
  
  // Get default task list
  const taskLists = await client.api("/me/todo/lists").get();
  const defaultList = taskLists.value?.[0];
  if (!defaultList) return res.status(400).json({ error: "No task list found" });
  
  const task = {
    title,
    body: { content: body || "", contentType: "text" },
    ...(dueISO && { dueDateTime: { dateTime: dueISO, timeZone: "UTC" } })
  };
  
  const created = await client.api(`/me/todo/lists/${defaultList.id}/tasks`).post(task);
  res.json(created);
});

router.patch("/:taskId/complete", async (req: any, res: any) => {
  const { taskId } = req.params;
  const { listId } = req.body || {};
  const userId = req.user?.id || req.session?.user?.id;
  if (!userId) return res.status(401).json({ error: "No session" });
  const token = await getValidAccessToken(userId);
  const client = Client.init({ authProvider: (done)=>done(null, token) });
  
  const updated = await client.api(`/me/todo/lists/${listId}/tasks/${taskId}`).patch({
    status: "completed"
  });
  res.json(updated);
});

export default router;