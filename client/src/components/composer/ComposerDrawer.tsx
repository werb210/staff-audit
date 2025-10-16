import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { X, Mail, MessageSquare, Calendar, FileText, Linkedin, Phone, Send, Copy, Clock, Users, ExternalLink } from "lucide-react";

type Tab = "email"|"sms"|"note"|"task"|"meeting"|"calllog"|"linkedin";

interface ComposerDrawerProps {
  open: boolean;
  onClose: () => void;
  contact: any;
}

export default function ComposerDrawer({ open, onClose, contact }: ComposerDrawerProps) {
  const [tab, setTab] = useState<Tab>("email");
  const [isLoading, setIsLoading] = useState(false);
  
  // Email state
  const [emailTo, setEmailTo] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  
  // SMS state
  const [smsBody, setSmsBody] = useState("");
  
  // Meeting state
  const [meetingSubject, setMeetingSubject] = useState("");
  const [meetingDate, setMeetingDate] = useState("");
  const [meetingTime, setMeetingTime] = useState("");
  const [proposedTimes, setProposedTimes] = useState<string[]>([]);
  
  // LinkedIn state
  const [linkedinDraft, setLinkedinDraft] = useState("");
  const [linkedinLinks, setLinkedinLinks] = useState<any>({});
  
  // Note/Task state
  const [noteContent, setNoteContent] = useState("");
  const [taskContent, setTaskContent] = useState("");

  useEffect(() => {
    if (open) {
      setTab("email");
      setEmailTo(contact?.email || "");
      setEmailSubject(`Follow up - ${contact?.name || contact?.company || "Discussion"}`);
      setEmailBody("");
      setSmsBody("");
      setNoteContent("");
      setTaskContent("");
      setLinkedinDraft("");
    }
  }, [open, contact]);

  // AI Helpers
  const handleDraftReply = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/composer/ai/draft-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contact: contact,
          toName: contact?.name,
          company: contact?.company,
          fromName: "BF Team"
        })
      });
      const data = await response.json();
      if (tab === "email") setEmailBody(data.text);
      if (tab === "sms") setSmsBody(data.text);
    } catch (error) {
      console.error("Draft reply failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleWrapUp = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/composer/ai/wrap-up', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notes: `Call with ${contact?.name} at ${contact?.company}`,
          transcript: "Discussion about financing options and next steps"
        })
      });
      const data = await response.json();
      setNoteContent(data.text);
      setTab("note");
    } catch (error) {
      console.error("Wrap up failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDocKit = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/composer/doc-kit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contact: contact,
          files: [{ name: "application_docs.pdf", contentType: "application/pdf" }]
        })
      });
      const data = await response.json();
      const checklistText = `Document Kit for ${contact?.name || contact?.company}:\n\n${data.checklist.map((item: string) => `• ${item}`).join('\n')}`;
      setTaskContent(checklistText);
      setTab("task");
    } catch (error) {
      console.error("Doc kit failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCueCards = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/composer/ai/cue-cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contact: contact,
          ruleHint: "revenue trends and financing needs"
        })
      });
      const data = await response.json();
      setNoteContent(data.text);
      setTab("note");
    } catch (error) {
      console.error("Cue cards failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleProposeTimes = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/composer/meeting/propose-times');
      const data = await response.json();
      setProposedTimes(data.slots || []);
    } catch (error) {
      console.error("Propose times failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLinkedinDraft = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/composer/ai/inmail-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toName: contact?.name,
          company: contact?.company,
          segment: "SMBs"
        })
      });
      const data = await response.json();
      setLinkedinDraft(data.text);
    } catch (error) {
      console.error("LinkedIn draft failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGetLinkedInLinks = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/composer/linkedin/links?companyDomain=${encodeURIComponent(contact?.company || '')}&profileUrl=${encodeURIComponent(contact?.linkedinUrl || '')}`);
      const data = await response.json();
      setLinkedinLinks(data);
    } catch (error) {
      console.error("LinkedIn links failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Send handlers
  const handleSendEmail = async () => {
    setIsLoading(true);
    try {
      await fetch('/api/composer/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: [emailTo],
          subject: emailSubject,
          html: emailBody.replace(/\n/g, '<br>')
        })
      });
      onClose();
    } catch (error) {
      console.error("Send email failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateMeeting = async () => {
    setIsLoading(true);
    try {
      const startISO = new Date(`${meetingDate}T${meetingTime}:00.000Z`).toISOString();
      const endISO = new Date(new Date(startISO).getTime() + 30 * 60000).toISOString(); // 30 min meeting
      
      await fetch('/api/composer/meeting/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: meetingSubject,
          startISO,
          endISO,
          attendees: [{ address: emailTo, type: "required" }],
          bodyHTML: `Meeting with ${contact?.name} from ${contact?.company}`
        })
      });
      onClose();
    } catch (error) {
      console.error("Create meeting failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[1200]">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute inset-y-0 right-0 w-[680px] max-w-[95vw] bg-white shadow-xl border-l flex flex-col">
        
        {/* Header */}
        <div className="p-4 border-b flex items-center justify-between bg-gray-50">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              {tab === "email" && <Mail className="w-5 h-5 text-blue-600" />}
              {tab === "sms" && <MessageSquare className="w-5 h-5 text-green-600" />}
              {tab === "meeting" && <Calendar className="w-5 h-5 text-purple-600" />}
              {tab === "note" && <FileText className="w-5 h-5 text-gray-600" />}
              {tab === "task" && <FileText className="w-5 h-5 text-orange-600" />}
              {tab === "linkedin" && <Linkedin className="w-5 h-5 text-blue-700" />}
              {tab === "calllog" && <Phone className="w-5 h-5 text-red-600" />}
            </div>
            <div>
              <h2 className="text-lg font-semibold">
                Compose {tab === "email" && "Email"}
                {tab === "sms" && "SMS"}
                {tab === "meeting" && "Meeting"}
                {tab === "note" && "Note"}
                {tab === "task" && "Task"}
                {tab === "linkedin" && "LinkedIn"}
                {tab === "calllog" && "Call Log"}
              </h2>
              <p className="text-sm text-gray-600">
                {contact?.name} • {contact?.company} • {contact?.email}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* AI Action Bar */}
        <div className="p-4 bg-blue-50 border-b">
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={handleDraftReply} disabled={isLoading}>
              <Send className="w-4 h-4 mr-1" />
              Draft Reply
            </Button>
            <Button size="sm" variant="outline" onClick={handleWrapUp} disabled={isLoading}>
              <FileText className="w-4 h-4 mr-1" />
              Wrap-up
            </Button>
            <Button size="sm" variant="outline" onClick={handleDocKit} disabled={isLoading}>
              <FileText className="w-4 h-4 mr-1" />
              Doc Kit
            </Button>
            <Button size="sm" variant="outline" onClick={handleCueCards} disabled={isLoading}>
              <Users className="w-4 h-4 mr-1" />
              Cue Cards
            </Button>
            <Button size="sm" variant="outline" onClick={handleProposeTimes} disabled={isLoading}>
              <Clock className="w-4 h-4 mr-1" />
              Propose Times
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)} className="flex-1 flex flex-col">
          <TabsList className="m-4 grid w-auto grid-cols-7">
            <TabsTrigger value="email" className="text-xs">Email</TabsTrigger>
            <TabsTrigger value="sms" className="text-xs">SMS</TabsTrigger>
            <TabsTrigger value="note" className="text-xs">Note</TabsTrigger>
            <TabsTrigger value="task" className="text-xs">Task</TabsTrigger>
            <TabsTrigger value="meeting" className="text-xs">Meeting</TabsTrigger>
            <TabsTrigger value="calllog" className="text-xs">Call Log</TabsTrigger>
            <TabsTrigger value="linkedin" className="text-xs">LinkedIn</TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-auto">
            {/* Email Tab */}
            <TabsContent value="email" className="p-4 space-y-4">
              <div className="space-y-4">
                <Input 
                  placeholder="To: email@domain.com" 
                  value={emailTo} 
                  onChange={(e) => setEmailTo(e.target.value)}
                />
                <Input 
                  placeholder="Subject" 
                  value={emailSubject} 
                  onChange={(e) => setEmailSubject(e.target.value)}
                />
                <Textarea 
                  placeholder="Email body..." 
                  value={emailBody} 
                  onChange={(e) => setEmailBody(e.target.value)}
                  rows={12}
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={onClose}>Cancel</Button>
                <Button onClick={handleSendEmail} disabled={isLoading}>
                  <Send className="w-4 h-4 mr-2" />
                  Send Email
                </Button>
              </div>
            </TabsContent>

            {/* SMS Tab */}
            <TabsContent value="sms" className="p-4 space-y-4">
              <div className="space-y-4">
                <div className="text-sm text-gray-600">
                  To: {contact?.phone || contact?.mobilePhone || "No phone number"}
                </div>
                <Textarea 
                  placeholder="SMS message..." 
                  value={smsBody} 
                  onChange={(e) => setSmsBody(e.target.value)}
                  rows={6}
                />
                <div className="text-right text-xs text-gray-500">
                  {smsBody.length}/160 characters
                </div>
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={onClose}>Cancel</Button>
                <Button disabled={isLoading}>
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Send SMS
                </Button>
              </div>
            </TabsContent>

            {/* Meeting Tab */}
            <TabsContent value="meeting" className="p-4 space-y-4">
              <div className="space-y-4">
                <Input 
                  placeholder="Meeting subject" 
                  value={meetingSubject} 
                  onChange={(e) => setMeetingSubject(e.target.value)}
                />
                <div className="grid grid-cols-2 gap-2">
                  <Input 
                    type="date" 
                    value={meetingDate} 
                    onChange={(e) => setMeetingDate(e.target.value)}
                  />
                  <Input 
                    type="time" 
                    value={meetingTime} 
                    onChange={(e) => setMeetingTime(e.target.value)}
                  />
                </div>
                
                {proposedTimes.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Suggested Times</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {proposedTimes.map((slot, i) => {
                        const [start, end] = slot.split('|');
                        return (
                          <Button 
                            key={i} 
                            variant="outline" 
                            size="sm" 
                            className="w-full justify-start"
                            onClick={() => {
                              const startDate = new Date(start);
                              setMeetingDate(startDate.toISOString().split('T')[0]);
                              setMeetingTime(startDate.toTimeString().slice(0, 5));
                            }}
                          >
                            {new Date(start).toLocaleString()}
                          </Button>
                        );
                      })}
                    </CardContent>
                  </Card>
                )}
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={onClose}>Cancel</Button>
                <Button onClick={handleCreateMeeting} disabled={isLoading}>
                  <Calendar className="w-4 h-4 mr-2" />
                  Create Meeting
                </Button>
              </div>
            </TabsContent>

            {/* Note Tab */}
            <TabsContent value="note" className="p-4 space-y-4">
              <div className="space-y-4">
                <Textarea 
                  placeholder="Add your notes here..." 
                  value={noteContent} 
                  onChange={(e) => setNoteContent(e.target.value)}
                  rows={12}
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={onClose}>Cancel</Button>
                <Button disabled={isLoading}>
                  <FileText className="w-4 h-4 mr-2" />
                  Save Note
                </Button>
              </div>
            </TabsContent>

            {/* Task Tab */}
            <TabsContent value="task" className="p-4 space-y-4">
              <div className="space-y-4">
                <Textarea 
                  placeholder="Create a task..." 
                  value={taskContent} 
                  onChange={(e) => setTaskContent(e.target.value)}
                  rows={8}
                />
                <div className="grid grid-cols-2 gap-2">
                  <Input type="date" placeholder="Due date" />
                  <select className="px-3 py-2 border border-gray-300 rounded-md">
                    <option>Normal Priority</option>
                    <option>High Priority</option>
                    <option>Low Priority</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={onClose}>Cancel</Button>
                <Button disabled={isLoading}>
                  <FileText className="w-4 h-4 mr-2" />
                  Create Task
                </Button>
              </div>
            </TabsContent>

            {/* LinkedIn Tab */}
            <TabsContent value="linkedin" className="p-4 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center">
                    <Linkedin className="w-4 h-4 mr-2" />
                    LinkedIn Tools
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Button size="sm" variant="outline" onClick={handleLinkedinDraft} disabled={isLoading}>
                      Draft Connection Request
                    </Button>
                    <Button size="sm" variant="outline" onClick={handleGetLinkedInLinks} disabled={isLoading}>
                      Get LinkedIn Links
                    </Button>
                  </div>
                  
                  {linkedinDraft && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Draft Message:</label>
                      <Textarea 
                        value={linkedinDraft} 
                        onChange={(e) => setLinkedinDraft(e.target.value)}
                        rows={4}
                      />
                      <Button size="sm" variant="outline" onClick={() => navigator.clipboard.writeText(linkedinDraft)}>
                        <Copy className="w-4 h-4 mr-1" />
                        Copy Draft
                      </Button>
                    </div>
                  )}
                  
                  {linkedinLinks.profile && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Quick Links:</label>
                      <div className="space-y-1">
                        {linkedinLinks.profile && (
                          <a href={linkedinLinks.profile} target="_blank" rel="noopener noreferrer" className="flex items-center text-blue-600 hover:underline text-sm">
                            <ExternalLink className="w-3 h-3 mr-1" />
                            View Profile
                          </a>
                        )}
                        {linkedinLinks.salesNavigator && (
                          <a href={linkedinLinks.salesNavigator} target="_blank" rel="noopener noreferrer" className="flex items-center text-blue-600 hover:underline text-sm">
                            <ExternalLink className="w-3 h-3 mr-1" />
                            Sales Navigator
                          </a>
                        )}
                        {linkedinLinks.peopleAtCompany && (
                          <a href={linkedinLinks.peopleAtCompany} target="_blank" rel="noopener noreferrer" className="flex items-center text-blue-600 hover:underline text-sm">
                            <ExternalLink className="w-3 h-3 mr-1" />
                            People at Company
                          </a>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Call Log Tab */}
            <TabsContent value="calllog" className="p-4 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Call Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-sm text-gray-600">
                    Last call: {contact?.lastCallDate || "No recent calls"}
                  </div>
                  <Textarea 
                    placeholder="Call notes and summary..." 
                    rows={8}
                  />
                  <div className="flex space-x-2">
                    <Button size="sm" variant="outline" onClick={handleWrapUp} disabled={isLoading}>
                      <FileText className="w-4 h-4 mr-1" />
                      Generate Summary
                    </Button>
                    <Button size="sm" variant="outline" onClick={handleDocKit} disabled={isLoading}>
                      <Send className="w-4 h-4 mr-1" />
                      Send Doc Kit
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}