import { createPortal } from "react-dom";
import { useEffect, useMemo, useRef, useState } from "react";

type Props = {
  open: boolean;
  kind: null | "call" | "email" | "note" | "schedule" | "upload" | "createApp";
  contact: { id: string; name: string; email?: string|null; phone?: string|null; company?: string|null; silo?: "BF"|"SLF" };
  onClose: () => void;
  onDone: () => void;
};

export function ContactActionModal({ open, kind, contact, onClose, onDone }: Props) {
  const target = useMemo(() => document.getElementById("contact-detail-panel") ?? document.body, []);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onEsc(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    if (open) document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, [open, onClose]);

  if (!open || !kind) return null;

  const Card = (children: React.ReactNode, title: string) => (
    <div className="absolute inset-0 z-30 flex items-start justify-center">
      <div className="fixed inset-0 bg-black/20" onClick={onClose} aria-hidden />
      <div role="dialog" aria-modal="true" aria-label={title}
        className="relative mt-10 w-full max-w-xl rounded-2xl bg-white shadow-2xl ring-1 ring-black/5">
        <div className="flex items-center justify-between border-b px-5 py-3">
          <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
          <button onClick={onClose} className="rounded-md px-2 py-1 text-gray-500 hover:bg-gray-100">✕</button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );

  // ---- Actions ----

  async function sendEmail(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    const fd = new FormData(e.currentTarget);
    const payload = {
      to: contact.email,
      subject: String(fd.get("subject") ?? ""),
      body: String(fd.get("body") ?? ""),
      contactId: contact.id,
    };
    const r = await fetch(`/api/communications/email/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" }, 
      body: JSON.stringify(payload),
    });
    setBusy(false);
    if (r.ok) onDone();
  }

  function openDialer() {
    // Silo-aware: default to BF if none
    const silo = contact.silo ?? "BF";
    window.dispatchEvent(new CustomEvent("dialer:open", { detail: { to: contact.phone, silo } }));
    onClose();
  }

  async function saveNote(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setBusy(true);
    const fd = new FormData(e.currentTarget);
    const r = await fetch(`/api/contacts/${contact.id}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" }, 
      body: JSON.stringify({ body: String(fd.get("note") ?? "") }),
    });
    setBusy(false);
    if (r.ok) onDone();
  }

  async function schedule(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setBusy(true);
    const fd = new FormData(e.currentTarget);
    const r = await fetch(`/api/contacts/${contact.id}/meetings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" }, 
      body: JSON.stringify({
        title: String(fd.get("title") ?? ""),
        when: String(fd.get("when") ?? ""),
        location: String(fd.get("location") ?? ""),
      })
    });
    setBusy(false);
    if (r.ok) onDone();
  }

  async function uploadDoc(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setBusy(true);
    const file = fileRef.current?.files?.[0];
    if (!file) return setBusy(false);
    const fd = new FormData();
    fd.set("file", file);
    const r = await fetch(`/api/contacts/${contact.id}/documents`, {
      method: "POST",  body: fd
    });
    setBusy(false);
    if (r.ok) onDone();
  }

  async function createApp() {
    setBusy(true);
    const r = await fetch(`/api/applications`, {
      method: "POST", 
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contactId: contact.id, source: "contact-quick-action" })
    });
    setBusy(false);
    if (r.ok) {
      const { id } = await r.json();
      onDone();
      // optional: navigate to pipeline drawer/open
      window.dispatchEvent(new CustomEvent("pipeline:open-app", { detail: { id } }));
    }
  }

  // ---- Sheets ----
  const TitleMap = {
    call: "Call contact",
    email: "Send email",
    note: "Add note",
    schedule: "Schedule meeting",
    upload: "Upload document",
    createApp: "Create application",
  } as const;

  const node =
    kind === "call" ? Card(
      <div className="space-y-4">
        <p className="text-sm text-gray-600">
          Call <span className="font-medium text-gray-900">{contact.name}</span>
          {contact.phone ? <> at <span className="font-mono">{contact.phone}</span></> : null}
        </p>
        <button onClick={openDialer}
          disabled={!contact.phone}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-700 disabled:opacity-40">
          Open Dialer
        </button>
      </div>, TitleMap.call
    )
    : kind === "email" ? Card(
      <form onSubmit={sendEmail} className="space-y-4">
        <div>
          <label className="text-xs text-gray-500">To</label>
          <input readOnly value={contact.email ?? ""} className="mt-1 w-full rounded-md border px-3 py-2 text-sm bg-gray-50" />
        </div>
        <div>
          <label className="text-xs text-gray-500">Subject</label>
          <input name="subject" className="mt-1 w-full rounded-md border px-3 py-2 text-sm" placeholder="Subject" />
        </div>
        <div>
          <label className="text-xs text-gray-500">Message</label>
          <textarea name="body" rows={6} className="mt-1 w-full rounded-md border px-3 py-2 text-sm" placeholder="Write your email…" />
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-md px-3 py-2 text-sm">Cancel</button>
          <button disabled={busy} className="rounded-md bg-indigo-600 px-3 py-2 text-sm text-white hover:bg-indigo-700">Send</button>
        </div>
      </form>, TitleMap.email
    )
    : kind === "note" ? Card(
      <form onSubmit={saveNote} className="space-y-4">
        <textarea name="note" rows={6} className="w-full rounded-md border px-3 py-2 text-sm" placeholder="Log a note…" />
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-md px-3 py-2 text-sm">Cancel</button>
          <button disabled={busy} className="rounded-md bg-gray-900 px-3 py-2 text-sm text-white">Save</button>
        </div>
      </form>, TitleMap.note
    )
    : kind === "schedule" ? Card(
      <form onSubmit={schedule} className="space-y-4">
        <input name="title" className="w-full rounded-md border px-3 py-2 text-sm" placeholder="Meeting title" />
        <input name="when" type="datetime-local" className="w-full rounded-md border px-3 py-2 text-sm" />
        <input name="location" className="w-full rounded-md border px-3 py-2 text-sm" placeholder="Location or video link" />
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-md px-3 py-2 text-sm">Cancel</button>
          <button disabled={busy} className="rounded-md bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700">Schedule</button>
        </div>
      </form>, TitleMap.schedule
    )
    : kind === "upload" ? Card(
      <form onSubmit={uploadDoc} className="space-y-4">
        <input ref={fileRef} type="file" className="block w-full text-sm" />
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-md px-3 py-2 text-sm">Cancel</button>
          <button disabled={busy} className="rounded-md bg-slate-700 px-3 py-2 text-sm text-white hover:bg-slate-800">Upload</button>
        </div>
      </form>, TitleMap.upload
    )
    : Card(
      <div className="space-y-4">
        <p className="text-sm text-gray-600">Create a new application linked to <span className="font-medium text-gray-900">{contact.name}</span>.</p>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="rounded-md px-3 py-2 text-sm">Cancel</button>
          <button onClick={createApp} disabled={busy} className="rounded-md bg-emerald-600 px-3 py-2 text-sm text-white hover:bg-emerald-700">Create</button>
        </div>
      </div>, TitleMap.createApp
    );

  return createPortal(node, target);
}