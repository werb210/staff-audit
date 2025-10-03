import React, { useState } from "react";
import SmsPanel from "./components/SmsPanel";
import EmailPanel from "./components/EmailPanel";
import VoicemailPanel from "./components/VoicemailPanel";

type Tab = "sms" | "email" | "calls" | "voicemail" | "talk" | "issues";

export default function CommsHub() {
  const [tab, setTab] = useState<Tab>("sms");

  return (
    <div className="grid grid-cols-12 gap-4">
      {/* Left column (contact list could go here later) */}
      <div className="col-span-4 hidden md:block">
        <div className="rounded border p-3 text-sm text-gray-500">
          Select a contact on the left or use Quick Compose →
        </div>
      </div>

      {/* Right column (tools) */}
      <div className="col-span-12 md:col-span-8">
        <div className="mb-3 flex gap-2">
          <button 
            className={`px-3 py-2 rounded text-sm ${tab==="sms" ? "bg-blue-100 text-blue-700 border border-blue-200" : "bg-gray-100 hover:bg-gray-200"}`} 
            onClick={()=>setTab("sms")}
          >
            SMS
          </button>
          <button 
            className={`px-3 py-2 rounded text-sm ${tab==="email" ? "bg-blue-100 text-blue-700 border border-blue-200" : "bg-gray-100 hover:bg-gray-200"}`} 
            onClick={()=>setTab("email")}
          >
            Email
          </button>
          <button 
            className={`px-3 py-2 rounded text-sm ${tab==="voicemail" ? "bg-blue-100 text-blue-700 border border-blue-200" : "bg-gray-100 hover:bg-gray-200"}`} 
            onClick={()=>setTab("voicemail")}
          >
            Voicemail
          </button>
          <button 
            className={`px-3 py-2 rounded text-sm ${tab==="calls" ? "bg-blue-100 text-blue-700 border border-blue-200" : "bg-gray-100 hover:bg-gray-200"}`} 
            onClick={()=>setTab("calls")}
          >
            Calls
          </button>
          <button 
            className={`px-3 py-2 rounded text-sm ${tab==="talk" ? "bg-blue-100 text-blue-700 border border-blue-200" : "bg-gray-100 hover:bg-gray-200"}`} 
            onClick={()=>setTab("talk")}
          >
            Talk to Human
          </button>
          <button 
            className={`px-3 py-2 rounded text-sm ${tab==="issues" ? "bg-blue-100 text-blue-700 border border-blue-200" : "bg-gray-100 hover:bg-gray-200"}`} 
            onClick={()=>setTab("issues")}
          >
            Report Issue
          </button>
        </div>

        <div className="rounded border p-4 bg-white">
          {tab === "sms" && <SmsPanel />}
          {tab === "email" && <EmailPanel />}
          {tab === "voicemail" && <VoicemailPanel />}
          {tab === "calls" && (
            <div className="text-sm text-gray-500">
              Use the "Open Dialer" button to place a call. Call history will appear here in the next sprint.
            </div>
          )}
          {tab === "talk" && (
            <div className="text-sm text-gray-500">
              Client chat escalations will show here when assigned.
            </div>
          )}
          {tab === "issues" && (
            <div className="text-sm text-gray-500">
              Issue tracker UI loads after Support API is unblocked.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}