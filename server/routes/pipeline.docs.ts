// server/routes/pipeline.docs.ts
import type { Request, Response } from "express";

const ALLOWED = new Set(["approve","reject","delete","replace"]);

export async function docAction(req: Request, res: Response) {
  const { id, docId, action } = req.params as {id:string;docId:string;action:string};
  if (!ALLOWED.has(action)) return res.status(400).json({ ok:false, error:"bad_action" });

  // TODO: wire to real storage / DB.
  // For now, simulate success and echo.
  const result = { ok:true, cardId:id, docId, action, at:Date.now() };
  return res.status(action === "delete" ? 204 : 200).json(result);
}