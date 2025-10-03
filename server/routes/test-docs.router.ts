import { Router, Request, Response } from "express";
import fs from "fs"; import path from "path";
let multer: any = null; try{ multer = require("multer"); }catch{}

type DocRec = { id:string; filename:string; mimetype:string; category?:string; size:number; paths:{ bin:string; ocr?:string } };
const ensureDir=(p:string)=>{ try{ fs.mkdirSync(p,{recursive:true}); }catch{} };
const b64toBuf=(b64:string)=> Buffer.from(b64.replace(/\s+/g,''),'base64');
const flatten=(obj:any, pre:string[]=[] as string[], out:any={})=>{
  const isObj=(v:any)=> v && typeof v==='object' && !Array.isArray(v);
  if(Array.isArray(obj)){ obj.forEach((v,i)=> flatten(v,[...pre,String(i)],out)); return out; }
  if(isObj(obj)){ Object.entries(obj).forEach(([k,v])=> flatten(v,[...pre,k],out)); return out; }
  out[pre.join(".")] = obj; return out;
};

const router = Router(); let LAST_DIR="";

function traceBase(req:Request){ const tid = (req.header("X-Trace-Id") || (req.body?._trace?.id) || ("trace-"+Date.now())); const base = path.join(process.cwd(),"reports","staff-docs-e2e-live",tid); ensureDir(base); LAST_DIR=base; return {tid,base}; }

function ocrText(buf:Buffer, mimetype:string): string {
  try{
    if(mimetype.startsWith("text/")) return buf.toString("utf8").slice(0,20000);
    // Try system pdftotext for PDFs (optional)
    if(mimetype==="application/pdf" && fs.existsSync("/usr/bin/pdftotext")){
      const tmpIn = path.join(process.cwd(), "tmp-doc-"+Date.now()+".pdf");
      const tmpOut = tmpIn+".txt"; fs.writeFileSync(tmpIn, buf);
      require("child_process").execFileSync("/usr/bin/pdftotext",[tmpIn,tmpOut],{stdio:'ignore'});
      const txt = fs.readFileSync(tmpOut,"utf8"); fs.unlinkSync(tmpIn); fs.unlinkSync(tmpOut); return txt.slice(0,20000);
    }
  }catch{}
  return ""; // no OCR available
}

function analyzeBankCsv(txt:string){
  if(!txt || !/date,.*amount/i.test(txt)) return null;
  const lines = txt.trim().split(/\r?\n/).slice(1);
  let credits=0, debits=0, nsf=0, balSum=0, balCount=0;
  for(const ln of lines){
    const cols = ln.split(","); if(cols.length<4) continue;
    const amt = parseFloat(cols[2]); const bal = parseFloat(cols[3]);
    if(!isNaN(amt)){ if(amt>=0) credits+=amt; else debits+=Math.abs(amt); }
    if(!isNaN(bal)){ balSum+=bal; balCount++; if(/nsf/i.test(cols[1])) nsf++; }
  }
  return { total_credits:Math.round(credits), total_debits:Math.round(debits), avg_balance: balCount? Math.round(balSum/balCount): null, nsf_count: nsf };
}

// JSON base64 upload
router.post("/upload", (req:Request, res:Response, next)=>{
  // If multer present and it's multipart, hand off; else parse JSON base64
  const ct = req.headers['content-type']||"";
  if(multer && /multipart\/form-data/i.test(ct)){
    const m = multer.memoryStorage ? multer({storage: multer.memoryStorage()}) : multer();
    return m.single("file")(req as any, res as any, ()=> {
      try{
        const { tid, base } = traceBase(req);
        const uploads = path.join(base,"docs"); ensureDir(uploads);
        const id = (Date.now().toString(36)+Math.random().toString(36).slice(2));
        const file = (req as any).file;
        const binPath = path.join(uploads, id+"-"+(file?.originalname||"unk.bin"));
        fs.writeFileSync(binPath, file?.buffer || Buffer.alloc(0));
        const ocrDir = path.join(base,"ocr"); ensureDir(ocrDir);
        const text = ocrText(file?.buffer||Buffer.alloc(0), file?.mimetype||"application/octet-stream");
        let ocrPath: string | undefined;
        if(text){ ocrPath = path.join(ocrDir, id+".txt"); fs.writeFileSync(ocrPath, text); }
        const rec:DocRec = { id, filename: (file?.originalname||"unknown"), mimetype: (file?.mimetype||"application/octet-stream"), category: (req.body?.category||undefined), size: (file?.size||0), paths:{bin:binPath, ocr:ocrPath} };
        const idx = path.join(base,"index.json"); let list:DocRec[]=[]; try{ list=JSON.parse(fs.readFileSync(idx,'utf8')); }catch{}
        list.push(rec); fs.writeFileSync(idx, JSON.stringify(list,null,2));
        return res.json({ ok:true, traceId: tid, docId: id, ocr: !!ocrPath });
      }catch(e){ return res.status(400).json({ok:false,error:String(e)}); }
    });
  }

  // JSON base64 path
  try{
    const { tid, base } = traceBase(req);
    const uploads = path.join(base,"docs"); ensureDir(uploads);
    const body:any = (req as any).body || {};
    const buf = body.content_base64? Buffer.from(String(body.content_base64).replace(/\s+/g,''),'base64'): Buffer.alloc(0);
    const id = (Date.now().toString(36)+Math.random().toString(36).slice(2));
    const bin = path.join(uploads, id+"-"+(body.filename||"file.bin"));
    fs.writeFileSync(bin, buf);
    const ocrDir = path.join(base,"ocr"); ensureDir(ocrDir);
    const text = ocrText(buf, body.mimetype||"");
    let ocrPath: string | undefined;
    if(text){ ocrPath = path.join(ocrDir, id+".txt"); fs.writeFileSync(ocrPath, text); }
    const rec:DocRec = { id, filename:(body.filename||"unknown"), mimetype:(body.mimetype||"application/octet-stream"), category: body.category, size: buf.length, paths:{bin, ocr:ocrPath} };
    const idx = path.join(base,"index.json"); let list:DocRec[]=[]; try{ list=JSON.parse(fs.readFileSync(idx,'utf8')); }catch{}
    list.push(rec); fs.writeFileSync(idx, JSON.stringify(list,null,2));
    return res.json({ ok:true, traceId: tid, docId: id, ocr: !!ocrPath });
  }catch(e){ return res.status(400).json({ok:false,error:String(e)}); }
});

// Submit: answers + docIds → analysis + card/pdf/export
router.post("/submit", (req:Request, res:Response)=>{
  const { tid, base } = traceBase(req);
  const answers = req.body?.answers || {};
  const docIds: string[] = Array.isArray(req.body?.docIds)? req.body.docIds: [];
  const idx = path.join(base,"index.json"); let list:DocRec[]=[]; try{ list=JSON.parse(fs.readFileSync(idx,'utf8')); }catch{}
  const picked = docIds.length? list.filter(d=> docIds.includes(d.id)): list;

  // Build banking analysis from any CSV OCR or raw CSV body
  let analysis:any = { docs_total: picked.length, bank: null as any };
  for(const d of picked){
    if((d.mimetype||"").includes("csv") || /bank/i.test(d.filename)){
      try{
        const raw = fs.readFileSync(d.paths.ocr || d.paths.bin, d.paths.ocr? "utf8":"utf8");
        const bank = analyzeBankCsv(raw || "");
        if(bank){ analysis.bank = bank; }
      }catch{}
    }
  }
  try{ fs.writeFileSync(path.join(base,"analysis.json"), JSON.stringify(analysis,null,2)); }catch{}

  // Build card/pdf/export shapes
  const applicationDate = (req.body?.applicationDate || new Date().toISOString().slice(0,10));
  const card = {
    id: tid,
    title: answers.legalName || answers.businessName || "Unknown Co",
    subtitle: `Applied ${applicationDate}`,
    doc_count: picked.length,
    banking: analysis.bank || null,
    metrics: {
      loanAmount: answers.loanAmount ?? answers.amountRequested ?? null,
      country: answers.country ?? null,
      revenue: answers.revenue ?? null
    }
  };
  const pdf = {
    applicationDate,
    applicant: { legalName: card.title },
    documents: picked.map(d=>({ id:d.id, filename:d.filename, category:d.category, size:d.size })),
    banking: analysis.bank || null,
    answers
  };
  const lender = {
    applicantName: card.title,
    applicationDate,
    amount: card.metrics.loanAmount,
    documents: picked.map(d=>({ id:d.id, name:d.filename, type:d.mimetype, category:d.category })),
    bankingSummary: analysis.bank || null,
    rawAnswers: answers
  };
  try{
    fs.writeFileSync(path.join(base,"card.json"), JSON.stringify(card,null,2));
    fs.writeFileSync(path.join(base,"pdf.json"), JSON.stringify(pdf,null,2));
    fs.writeFileSync(path.join(base,"lender.json"), JSON.stringify(lender,null,2));
  }catch{}

  // Coverage across surfaces
  const inboundFlat = flatten(answers);
  const inboundKeys = Object.keys(inboundFlat);
  const keysOf = (o:any)=> Object.keys(flatten(o));
  const coverage = {
    inbound_total: inboundKeys.length,
    card_total: keysOf(card).length,
    pdf_total: keysOf(pdf).length,
    lender_total: keysOf(lender).length,
    missing_in_card: inboundKeys.filter(k=> !keysOf(card).includes(k)),
    missing_in_pdf: inboundKeys.filter(k=> !keysOf(pdf).includes(k)),
    missing_in_lender: inboundKeys.filter(k=> !keysOf(lender).includes(k)),
  };
  try{ fs.writeFileSync(path.join(base,"coverage.json"), JSON.stringify(coverage,null,2)); }catch{}

  return res.json({ ok:true, traceId: tid, coverage, files:{
    index: path.relative(process.cwd(), path.join(base,"index.json")),
    analysis: path.relative(process.cwd(), path.join(base,"analysis.json")),
    card: path.relative(process.cwd(), path.join(base,"card.json")),
    pdf: path.relative(process.cwd(), path.join(base,"pdf.json")),
    lender: path.relative(process.cwd(), path.join(base,"lender.json")),
    coverageFile: path.relative(process.cwd(), path.join(base,"coverage.json")),
  }});
});

// Helpers
router.get("/last", (_req:Request, res:Response)=>{
  if(!LAST_DIR) return res.status(404).json({ok:false,error:"no_submissions"});
  const read=(f:string)=>{ try{return JSON.parse(fs.readFileSync(path.join(LAST_DIR,f),'utf8'));}catch{return null;} };
  res.json({ ok:true, last: {
    dir: LAST_DIR,
    index: read("index.json"),
    analysis: read("analysis.json"),
    card: read("card.json"),
    pdf: read("pdf.json"),
    lender: read("lender.json"),
    coverage: read("coverage.json")
  }});
});

export default router;