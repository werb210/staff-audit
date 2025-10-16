import express from "express";
import { overview, smartNegatives, rebalance } from "../lib/adsAnalytics";
import { aiExplainChange, aiWriteAds, aiAssetGaps, aiSmartNegatives } from "../lib/adsAI";

const r = express.Router();

// Overview + anomalies + movers
r.get("/overview", async (req,res,next)=>{
  try{
    const customerId = String(req.query.customerId||"default");
    const range = String(req.query.range||"last_7_days");
    const data = await overview(customerId, range);
    res.json(data);
  }catch(e){ next(e); }
});

// Budget rebalancer
r.post("/rebalance", express.json(), async (req,res,next)=>{
  try{
    const { campaigns=[], monthlyTarget=0 } = req.body||{};
    res.json(rebalance(campaigns, monthlyTarget));
  }catch(e){ next(e); }
});

// Smart negatives (heuristic) + AI cluster text
r.get("/negatives", async (req,res,next)=>{
  try{
    const customerId = String(req.query.customerId||"default");
    const range = String(req.query.range||"last_30_days");
    const base = await smartNegatives(customerId, range);
    const ai = await aiSmartNegatives(base);
    res.json({ ...base, ai });
  }catch(e){ next(e); }
});

// AI: explain changes, copywriter, asset gaps
r.post("/ai/explain", express.json(), async (req,res,next)=>{
  try{ res.json({ text: await aiExplainChange(req.body||{}) }); } catch(e){ next(e); }
});
r.post("/ai/copy", express.json(), async (req,res,next)=>{
  try{ res.json({ text: await aiWriteAds(req.body||{}) }); } catch(e){ next(e); }
});
r.post("/ai/assets", express.json(), async (req,res,next)=>{
  try{ res.json({ text: await aiAssetGaps(req.body?.assets||[]) }); } catch(e){ next(e); }
});

export default r;