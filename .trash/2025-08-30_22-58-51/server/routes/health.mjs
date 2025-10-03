import express from 'express';
export default function healthRoutes(){
  const r = express.Router();
  r.get('/healthz', (_req,res)=>res.type('text/plain').send('ok'));
  r.get('/readyz',  (_req,res)=>res.json({ ok:true, ts: Date.now() }));
  r.get('/api/health', (_req,res)=>res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    service: 'boreal-financial-api',
    version: '1.0.0'
  }));
  return r;
}