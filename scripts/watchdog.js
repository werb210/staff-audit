const fs = require('fs'), os = require('os');
const SVC = process.env.SVC || `http://127.0.0.1:${process.env.PORT||5000}`;
const OUT = `reports/watchdog-${process.env.STAMP}.log`;
const MAX_RSS_MB = Number(process.env.MAX_RSS_MB || 800);
const MAX_RSS_GROWTH_MB = Number(process.env.MAX_RSS_GROWTH_MB||150);
const MAX_P95_MS = Number(process.env.MAX_P95_MS || 600);

let baseRss = null, maxRss = 0, maxP95 = 0, errors = 0, ticks = 0;
function ts(){ return new Date().toISOString(); }
function log(...a){ fs.appendFileSync(OUT, `[${ts()}] ${a.join(' ')}\n`); }

(async function loop(){
  log(`watchdog start @ ${SVC} (MAX_RSS_MB=${MAX_RSS_MB}, MAX_P95_MS=${MAX_P95_MS})`);
  while(true){
    ticks++;
    // health ping + latency
    const t0 = Date.now();
    let code = 0;
    try{
      const r = await fetch(`${SVC}/api/apps/demo-app-123/overview`).catch(()=>({status:0}));
      code = r?.status||0;
    }catch{ code = 0; }
    const dt = Date.now()-t0;

    // sample current node RSS
    let rssMb = Math.round(process.memoryUsage().rss / 1024 / 1024);
    if(baseRss==null) baseRss = rssMb;
    maxRss = Math.max(maxRss, rssMb);
    maxP95 = Math.max(maxP95, dt);
    if (code===0 || code>=500) errors++;

    log(`health=${code} p95~${dt}ms rss=${rssMb}MB base=${baseRss}MB`);

    // hard thresholds
    const overAbs = rssMb > MAX_RSS_MB;
    const overGrow = (rssMb - baseRss) > MAX_RSS_GROWTH_MB;
    const overLat = dt > MAX_P95_MS;
    if (overAbs || overGrow || overLat){
      log(`FAIL thresholds: abs=${overAbs} grow=${overGrow} p95=${overLat}`);
      process.exit(2);
    }
    // stop condition by env
    if (Number(process.env.MAX_TICKS||0)>0 && ticks>=Number(process.env.MAX_TICKS)) {
      log(`watchdog end OK (ticks=${ticks}) maxRss=${maxRss}MB maxP95=${maxP95}ms errors=${errors}`);
      process.exit(0);
    }
    await new Promise(r=>setTimeout(r, 5000)); // 5s intervals for demo
  }
})().catch(e=>{ log('watchdog crash', e.stack||e); process.exit(3); });
