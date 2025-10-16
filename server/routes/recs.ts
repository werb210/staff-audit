import { Router } from "express";
import { allItems } from "../pipeline/store";
import { lenders, products, scoreLender } from "../lenders/store";

const r = Router();

// GET /api/recs/:appId  -> ranked list
r.get("/:appId", (req: any, res: any) => {
  const apps = allItems();
  const a = apps[req.params.appId];
  if (!a) return res.status(404).json({ error: "not_found" });

  const recs = Object.values(lenders).map(l => {
    const p = Object.values(products).filter(pr => pr.lenderId === l.id);
    const input = { region: 'CA-ON', amount: a.amount || 0, creditScore: 700, timeInBusinessMonths: 24, industry: 'services' };
    const result = scoreLender(l, input);
    const score = result.score;
    return { lender: l, products: p, score };
  }).sort((x,y) => y.score - x.score);

  res.json(recs.slice(0, 8));
});

// GET /api/recs/:appId/pdf  -> stub PDF
r.get("/:appId/pdf", (req: any, res: any) => {
  const apps = allItems();
  const a = apps[req.params.appId];
  if (!a) return res.status(404).json({ error: "not_found" });
  // simple PDF stub
  const txt = `Lender Recommendations for ${a.businessName}\nGenerated: ${new Date().toISOString()}`;
  const pdf = Buffer.from(txt, "utf8");
  res.status(200)
    .setHeader("Content-Type", "application/pdf")
    .setHeader("Content-Disposition", `inline; filename="recs-${a.id}.pdf"`)
    .send(pdf);
});

export default r;