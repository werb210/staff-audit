import React from "react";
// Note: voiceApi moved to avoid circular imports - implement direct API calls

export default function DialerSlidein(){
  const [open,setOpen]=React.useState(false);
  const [num,setNum]=React.useState("");
  const [status,setStatus]=React.useState<"idle"|"connecting"|"in-call"|"ended"|"error">("idle");
  const [busy,setBusy]=React.useState(false);
  React.useEffect(()=>{ (window as any).openDialer = (to?:string)=>{ if(to) setNum(to); setOpen(true); }; },[]);
  function press(k:string){ setNum(n=>(n+k).replace(/[^\d+]/g,"")); }
  function back(){ setNum(n=>n.slice(0,-1)); }
  async function call(){
    setBusy(true); setStatus("connecting");
    try {
      const response = await fetch('/api/voice/call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: num })
      });
      if (response.ok) {
        setStatus("in-call");
        console.log("Call initiated");
      } else {
        throw new Error('Call failed');
      }
    } catch (error) {
      console.error("Call failed:", error);
      setStatus("error");
    }
    setBusy(false);
  }
  async function end(){ 
    setStatus("ended"); 
    // Note: Voice API doesn't have direct hangup - calls are managed by Twilio
    console.log("Call ended");
  }
  return (
    <div id="dialer-slidein" className={open?"open":""}>
      <div className="dialer-head">
        <strong>Dialer</strong>
        <div style={{display:"flex",gap:8}}>
          <input className="lm-input" value={num} onChange={e=>setNum(e.target.value)} placeholder="+1 (___) ___-____" />
          <button className="lm-btn" onClick={()=>setOpen(false)}>Close</button>
        </div>
      </div>
      <div className="dialer-main">
        <div className="lm-card" style={{padding:12}}>
          <div className="lm-subtle lm-mini">{status==="in-call"?"On call":status==="connecting"?"Connecting…":status==="ended"?"Ended":""}</div>
        </div>
        <div className="dialer-keypad">
          {["1","2","3","4","5","6","7","8","9","*","0","#"].map(k=><button key={k} className="dialer-key" onClick={()=>press(k)}>{k}</button>)}
        </div>
        <div className="dialer-actions">
          <button className="dialer-btn green" onClick={call} disabled={!num || busy} title="Call">▶</button>
          <button className="dialer-btn red" onClick={end} title="End">⭘</button>
          <button className="lm-btn" onClick={back} title="Backspace">⌫</button>
        </div>
      </div>
    </div>
  );
}