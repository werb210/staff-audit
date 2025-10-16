import { useState } from "react";
import { Phone, Mail, StickyNote, CalendarClock, Paperclip, FilePlus2 } from "lucide-react";
import { ContactActionModal } from "./ContactActionModal";

type Contact = {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  silo?: "BF" | "SLF";
};

export function ContactActionBar({ contact, onRefresh }:{
  contact: Contact;
  onRefresh?: () => void;
}) {
  const [action, setAction] = useState<null | 
    "call" | "email" | "note" | "schedule" | "upload" | "createApp">(null);

  const Btn = ({icon:Icon, label, onClick, disabled}:{icon:any;label:string;onClick:()=>void;disabled?:boolean}) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-2 rounded-full border border-gray-300 bg-white px-3.5 py-2 text-sm font-medium hover:bg-gray-50 active:bg-gray-100 disabled:opacity-40"
      title={label}
    >
      <Icon className="h-4 w-4" aria-hidden />
      <span>{label}</span>
    </button>
  );

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <Btn icon={Phone} label="Call" onClick={() => {
        if (contact.phone) {
          window.dispatchEvent(new CustomEvent("dialer:open", {
            detail: { to: contact.phone, silo: contact.silo ?? "BF" }
          }));
        }
      }} disabled={!contact.phone} />
      <Btn icon={Mail} label="Email" onClick={()=>setAction("email")} disabled={!contact.email} />
      <Btn icon={StickyNote} label="Note" onClick={()=>setAction("note")} />
      <Btn icon={CalendarClock} label="Schedule" onClick={()=>setAction("schedule")} />
      <Btn icon={Paperclip} label="Upload" onClick={()=>setAction("upload")} />
      <Btn icon={FilePlus2} label="Create Application" onClick={()=>setAction("createApp")} />
      <ContactActionModal
        open={!!action}
        kind={action}
        contact={contact}
        onClose={() => setAction(null)}
        onDone={() => { setAction(null); onRefresh?.(); }}
      />
    </div>
  );
}