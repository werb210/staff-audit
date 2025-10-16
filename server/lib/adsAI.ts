let openai:any=null; 
try { 
  const { OpenAI } = await import("openai"); 
  openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY||"" }); 
} catch {}

const model = process.env.OPENAI_MODEL || "gpt-5"; // the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user

async function chat(sys:string, user:string){
  if(!openai) return null;
  try{
    const r:any = await openai.chat.completions.create({ 
      model, 
      temperature:0.6, 
      messages:[
        {role:"system", content:sys},
        {role:"user", content:user}
      ] 
    });
    return r.choices?.[0]?.message?.content?.trim() || null;
  }catch{ return null; }
}

export async function aiExplainChange(ctx:any){
  const sys="You are a senior performance marketer. Explain changes succinctly with clear drivers and recommended actions.";
  const user=`KPIs: ${JSON.stringify(ctx.kpis)}\nAnomalies: ${JSON.stringify(ctx.anomalies)}\nTop movers: ${JSON.stringify(ctx.topMovers)}\nUnderperformers: ${JSON.stringify(ctx.underperf)}\n`;
  return await chat(sys,user) || "Spend stable; ROAS soft due to CPA drift. Tighten match types, add negatives on non-converting themes, and rebalance 15% from losers to winners.";
}

export async function aiWriteAds(input:{product:string; audience:string; tone?:string; lp?:string;}){
  const sys="You write compliant Google Ads text. 5 headlines (≤30 chars), 4 descriptions (≤90). Avoid superlatives and illegal claims.";
  const user=`Product: ${input.product}\nAudience: ${input.audience}\nTone: ${input.tone||"practical, trustworthy"}\nLanding page: ${input.lp||"n/a"}`;
  const out = await chat(sys,user);
  return out || `Headlines:\n- Flexible working capital\n- Approvals in days\n- Fund payroll & growth\n- Invoice financing made easy\n- Cash flow for SMEs\n\nDescriptions:\n- Apply in minutes. Transparent rates. No hidden fees.\n- Finance inventory or payroll with flexible terms.\n- Keep cash moving with invoice financing options.\n- Talk to a specialist today.`;
}

export async function aiAssetGaps(assets:any[]){
  const sys="You are a Google PMax asset auditor. List missing sizes/types for images/videos and suggest what to create.";
  const user=`Assets: ${JSON.stringify(assets).slice(0,4000)}`;
  return await chat(sys,user) || "Missing: 1200x1200, 1200x628 images; 15s vertical video. Create brand-safe variants and upload.";
}

export async function aiSmartNegatives(data:any){
  const sys="You are an SEM specialist. Cluster non-converting search terms and output negative keyword themes.";
  const user=`Terms: ${JSON.stringify(data).slice(0,3000)}`;
  return await chat(sys,user) || "Themes: 'free/cheap', 'jobs/careers', 'what is', 'personal loans'. Add as phrase match negatives.";
}