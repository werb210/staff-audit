import { Router } from "express";
export const lookup = Router();

lookup.get("/phone", async (req: any, res: any) => {
  const phone = String(req.query.phone || "");
  if (!phone) return res.status(400).json({ error: "missing_phone" });
  
  // TODO: wire to Twilio Lookups; for now return safe stub
  res.json({ 
    ok: true, 
    phone, 
    carrier: { type: "mobile", name: "Verizon" }, 
    line_type: "mobile",
    caller_name: null,
    country_code: "US"
  });
});

export default lookup;