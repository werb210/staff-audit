import { Router } from "express";
const r = Router();

// Microsoft Graph webhook validation: echo validationToken if provided
r.get("/webhooks/graph", (req,res)=>{
  const token = req.query.validationToken as string;
  if (token) return res.status(200).send(token);
  res.status(400).end();
});

r.post("/webhooks/graph", (req,res)=>{
  // Process notifications
  // TODO: pull /me/messages delta or events; existing inbox pipeline can consume
  res.status(202).end();
});

export default r;