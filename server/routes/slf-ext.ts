import express from "express";
import axios from "axios";
const r = express.Router();

const base = process.env.SLF_EXT_BASE || "https://qa-fintech.buildingdigital.com";
const token = process.env.SLF_EXT_TOKEN || "Token c6b32011b346f3cf2df798ceb20757aec835d74b";

console.log('🔍 SLF External config:', { base, hasToken: !!token });

const ext = axios.create({
  baseURL: base,
  headers: { Authorization: token, Accept: "application/json" },
  timeout: 15000,
});

r.get("/credit/requests", async (_req, res) => {
  try { 
    const { data } = await ext.get("/api/credit/request/view/all/");
    // API returns {requests: [...]} structure
    res.json({ ok: true, items: data?.requests || [] });
  } catch (e:any) { 
    console.error('SLF External API Error:', e.message);
    res.status(502).json({ ok:false, error: e?.response?.data || e.message }); 
  }
});

r.get("/credit/requests/:id", async (req: any, res: any) => {
  try { const { data } = await ext.get(`/api/credit/request/view/${req.params.id}/`);
    res.json({ ok: true, item: data });
  } catch (e:any) { res.status(502).json({ ok:false, error: e?.response?.data || e.message }); }
});

// === CREDIT BIDS ===
r.get("/credit/bids/:id", async (req: any, res: any) => {
  try { const { data } = await ext.get(`/api/credit/bid/view/${req.params.id}/`);
    res.json({ ok: true, item: data });
  } catch (e:any) { res.status(502).json({ ok:false, error: e?.response?.data || e.message }); }
});

r.get("/credit/bids/completed", async (req: any, res: any) => {
  try { const { data } = await ext.get("/api/credit/bid/view/completed/");
    res.json({ ok: true, items: data });
  } catch (e:any) { res.status(502).json({ ok:false, error: e?.response?.data || e.message }); }
});

r.get("/credit/bids/pending", async (req: any, res: any) => {
  try { const { data } = await ext.get("/api/credit/bid/view/pending/");
    res.json({ ok: true, items: data });
  } catch (e:any) { res.status(502).json({ ok:false, error: e?.response?.data || e.message }); }
});

// === EQUIPMENT FINANCING ===
r.get("/equipment/requests", async (req: any, res: any) => {
  try { const { data } = await ext.get("/api/equipment-financing/request/view/all/");
    res.json({ ok: true, items: data });
  } catch (e:any) { res.status(502).json({ ok:false, error: e?.response?.data || e.message }); }
});

r.get("/equipment/requests/:id", async (req: any, res: any) => {
  try { const { data } = await ext.get(`/api/equipment-financing/request/view/${req.params.id}/`);
    res.json({ ok: true, item: data });
  } catch (e:any) { res.status(502).json({ ok:false, error: e?.response?.data || e.message }); }
});

r.get("/equipment/bids", async (req: any, res: any) => {
  try { const { data } = await ext.get("/api/equipment-financing/bid/view/all/");
    res.json({ ok: true, items: data });
  } catch (e:any) { res.status(502).json({ ok:false, error: e?.response?.data || e.message }); }
});

r.get("/equipment/bids/:id", async (req: any, res: any) => {
  try { const { data } = await ext.get(`/api/equipment-financing/bid/view/${req.params.id}/`);
    res.json({ ok: true, item: data });
  } catch (e:any) { res.status(502).json({ ok:false, error: e?.response?.data || e.message }); }
});

r.get("/equipment/quote-details/:fileId", async (req: any, res: any) => {
  try { const { data } = await ext.get(`/api/equipment-financing/request/quote-details/${req.params.fileId}/`);
    res.json({ ok: true, item: data });
  } catch (e:any) { res.status(502).json({ ok:false, error: e?.response?.data || e.message }); }
});

// === FACTORING BIDS ===
r.get("/factoring/bids/pending", async (req: any, res: any) => {
  try { const { data } = await ext.get("/api/factoring-bid/view/pending/");
    res.json({ ok: true, items: data });
  } catch (e:any) { res.status(502).json({ ok:false, error: e?.response?.data || e.message }); }
});

r.get("/factoring/bids/:id", async (req: any, res: any) => {
  try { const { data } = await ext.get(`/api/factoring-bid/view/${req.params.id}/`);
    res.json({ ok: true, item: data });
  } catch (e:any) { res.status(502).json({ ok:false, error: e?.response?.data || e.message }); }
});

r.get("/factoring/view-fi", async (req: any, res: any) => {
  try { const { data } = await ext.get("/api/factoring-bid/view-fi/");
    res.json({ ok: true, items: data });
  } catch (e:any) { res.status(502).json({ ok:false, error: e?.response?.data || e.message }); }
});

// === FINANCIAL INSTITUTIONS ===
r.get("/fininst/requests", async (req: any, res: any) => {
  try { const { data } = await ext.get("/api/fininst/requests/view/all/");
    res.json({ ok: true, items: data });
  } catch (e:any) { res.status(502).json({ ok:false, error: e?.response?.data || e.message }); }
});

r.get("/fininst/:id", async (req: any, res: any) => {
  try { const { data } = await ext.get(`/api/fininst/view/${req.params.id}/`);
    res.json({ ok: true, item: data });
  } catch (e:any) { res.status(502).json({ ok:false, error: e?.response?.data || e.message }); }
});

r.get("/fininst/messages", async (req: any, res: any) => {
  try { const { data } = await ext.get("/api/fininst/messages/view/all/");
    res.json({ ok: true, items: data });
  } catch (e:any) { res.status(502).json({ ok:false, error: e?.response?.data || e.message }); }
});

r.get("/fininst/metrics", async (req: any, res: any) => {
  try { const { data } = await ext.get("/api/fininst/metrics/");
    res.json({ ok: true, item: data });
  } catch (e:any) { res.status(502).json({ ok:false, error: e?.response?.data || e.message }); }
});

r.get("/fininst/user", async (req: any, res: any) => {
  try { const { data } = await ext.get("/api/fininst/view-user/");
    res.json({ ok: true, item: data });
  } catch (e:any) { res.status(502).json({ ok:false, error: e?.response?.data || e.message }); }
});

r.get("/fininst/summary", async (req: any, res: any) => {
  try { const { data } = await ext.get("/api/fininst/view/summary/");
    res.json({ ok: true, item: data });
  } catch (e:any) { res.status(502).json({ ok:false, error: e?.response?.data || e.message }); }
});

// === INVOICES ===
r.get("/invoices", async (req: any, res: any) => {
  try { const { data } = await ext.get("/api/invoice/view-all/");
    res.json({ ok: true, items: data });
  } catch (e:any) { res.status(502).json({ ok:false, error: e?.response?.data || e.message }); }
});

r.get("/invoices/:id", async (req: any, res: any) => {
  try { const { data } = await ext.get(`/api/invoice/view-combined/${req.params.id}/`);
    res.json({ ok: true, item: data });
  } catch (e:any) { res.status(502).json({ ok:false, error: e?.response?.data || e.message }); }
});

// === CHANGE ORDERS ===
r.get("/change-orders/:id", async (req: any, res: any) => {
  try { const { data } = await ext.get(`/api/change-order/view/${req.params.id}/`);
    res.json({ ok: true, item: data });
  } catch (e:any) { res.status(502).json({ ok:false, error: e?.response?.data || e.message }); }
});

r.get("/change-orders/contract/:contractId", async (req: any, res: any) => {
  try { const { data } = await ext.get(`/api/change-order/view-contract/${req.params.contractId}/`);
    res.json({ ok: true, items: data });
  } catch (e:any) { res.status(502).json({ ok:false, error: e?.response?.data || e.message }); }
});

// === PARTNERSHIPS ===
r.get("/partnerships", async (req: any, res: any) => {
  try { const { data } = await ext.get("/api/partnerships/view/");
    res.json({ ok: true, items: data });
  } catch (e:any) { res.status(502).json({ ok:false, error: e?.response?.data || e.message }); }
});

// === FILES ===
r.get("/files/:id", async (req: any, res: any) => {
  try { const { data } = await ext.get(`/api/sub/file/view/${req.params.id}/`);
    res.json({ ok: true, item: data });
  } catch (e:any) { res.status(502).json({ ok:false, error: e?.response?.data || e.message }); }
});

export default r;