import { NavLink, Routes, Route, Navigate, useSearchParams } from "react-router-dom";
import Sms from "../../modules/comms/twilio/SmsThreads";
import Calls from "../../modules/comms/twilio/CallLogs";
import Email from "../../modules/comms/o365/EmailClient";
import ChatHandoff from "../../modules/chat/ChatHandoff"; // merged chat/handoff
import DialerSlide from "../../components/DialerSlide";

const tabs = [
  {to:"sms", label:"SMS (Twilio)"},
  {to:"calls", label:"Calls (Twilio)"},
  {to:"email", label:"Email (Office 365)"},
  {to:"chat", label:"Chat & Handoff"},
];

export default function Comms(){
  const [sp] = useSearchParams();
  const compose = sp.get("compose");
  const thread = sp.get("thread");
  return (
    <div>
      <div className="card pad" style={{marginBottom:16}}>
        <nav style={{display:"flex",gap:16,flexWrap:"wrap", alignItems:"center"}}>
          {tabs.map(t=><NavLink key={t.to} to={t.to} className={({isActive})=>"lm-tab"+(isActive?" active":"")}>{t.label}</NavLink>)}
          <div style={{marginLeft:"auto"}}>
            <DialerSlide />
          </div>
        </nav>
      </div>
      <Routes>
        <Route path="/" element={<Navigate to="sms" replace />} />
        <Route path="sms" element={<Sms initialThreadId={thread||undefined} />} />
        <Route path="calls" element={<Calls/>} />
        <Route path="email" element={<Email compose={compose==="1"} />} />
        <Route path="chat" element={<ChatHandoff/>} />
      </Routes>
    </div>
  );
}