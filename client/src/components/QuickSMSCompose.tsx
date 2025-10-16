import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/queryClient";

export default function QuickSMSCompose() {
  const [to, setTo] = useState("");
  const [msg, setMsg] = useState("");
  const [sending, setSending] = useState(false);
  const { toast } = useToast();

  const sendSMS = async () => {
    if (!to.trim() || !msg.trim()) return;
    
    setSending(true);
    try {
      await api('/api/sms/send', {
        method: 'POST',
        body: { to: to.trim(), message: msg.trim() }
      });
      
      setTo("");
      setMsg("");
      toast({
        title: "SMS sent successfully!",
        description: `Message sent to ${to}`
      });
    } catch (error) {
      console.error('Failed to send SMS:', error);
      toast({
        title: "Failed to send SMS",
        description: "Please check the phone number and try again.",
        variant: "destructive"
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="p-4 border rounded-lg bg-gray-50">
      <h3 className="font-medium mb-3">📱 Quick SMS</h3>
      <div className="space-y-3">
        <div className="flex gap-2">
          <Input
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="Phone (E.164 format)"
            className="flex-1"
          />
          <Button 
            onClick={sendSMS}
            disabled={sending || !to.trim() || !msg.trim()}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {sending ? "Sending..." : "Send"}
          </Button>
        </div>
        <Textarea
          value={msg}
          onChange={(e) => setMsg(e.target.value)}
          rows={4}
          placeholder="Type your message..."
        />
      </div>
    </div>
  );
}