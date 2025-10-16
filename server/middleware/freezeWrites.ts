export function freezeWrites(req:any, res:any, next:any){
  const on = String(process.env.FREEZE_WRITES || "false") === "true";
  const mut = ["POST","PUT","PATCH","DELETE"].includes(req.method);
  if (on && mut) return res.status(503).json({ ok: false, error: "writes_frozen_for_investigation" });
  next();
}