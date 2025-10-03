import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/queryClient";

export default function QuickEmailCompose() {
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const { toast } = useToast();

  const sendEmail = async () => {
    if (!to.trim() || !subject.trim() || !message.trim()) return;
    
    setSending(true);
    try {
      await api('/api/o365/mail/send', {
        method: 'POST',
        body: { 
          to: to.trim(), 
          subject: subject.trim(),
          body: message.trim()
        }
      });
      
      setTo("");
      setSubject("");
      setMessage("");
      toast({
        title: "Email sent successfully!",
        description: `Email sent to ${to}`
      });
    } catch (error) {
      console.error('Failed to send email:', error);
      toast({
        title: "Failed to send email",
        description: "Please check the email address and try again.",
        variant: "destructive"
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="p-4 border rounded-lg bg-gray-50">
      <h3 className="font-medium mb-3">📧 Quick Email</h3>
      <div className="space-y-3">
        <Input
          value={to}
          onChange={(e) => setTo(e.target.value)}
          placeholder="Recipient email"
        />
        <Input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Subject"
        />
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={6}
          placeholder="Type your email message..."
        />
        <Button 
          onClick={sendEmail}
          disabled={sending || !to.trim() || !subject.trim() || !message.trim()}
          className="w-full bg-blue-600 hover:bg-blue-700"
        >
          {sending ? "Sending..." : "Send Email"}
        </Button>
      </div>
    </div>
  );
}