import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Trash2, Download, Clock, Phone, User, Calendar } from "lucide-react";

type Mailbox = { id: string; label: string; recipients: string[]; unread: number };
type Message = {
  id: string;
  mailboxId: string;
  from?: string;
  recordingUrl: string;
  durationSec?: number;
  createdAt: string;
  read: boolean;
  tenant: "bf" | "slf";
  transcriptionText?: string;
};

export default function VoicemailInbox() {
  const [activeMailbox, setActiveMailbox] = React.useState<string>("");

  // Fetch mailboxes
  const { data: mailboxesData } = useQuery({
    queryKey: ['/api/voice/mailboxes'],
    queryFn: async () => {
      const response = await fetch('/api/voice/mailboxes');
      if (!response.ok) throw new Error('Failed to fetch mailboxes');
      return response.json();
    },
    refetchInterval: 30000, // Poll every 30 seconds for new messages
  });

  const mailboxes: Mailbox[] = mailboxesData?.mailboxes || [];

  // Fetch messages for active mailbox
  const { data: messagesData, refetch: refetchMessages } = useQuery({
    queryKey: ['/api/voice/mailbox', activeMailbox, 'messages'],
    queryFn: async () => {
      if (!activeMailbox) return { messages: [] };
      const response = await fetch(`/api/voice/mailbox/${activeMailbox}/messages`);
      if (!response.ok) throw new Error('Failed to fetch messages');
      return response.json();
    },
    enabled: !!activeMailbox,
    refetchInterval: 15000, // Poll every 15 seconds for new messages
  });

  const messages: Message[] = messagesData?.messages || [];

  // Set default active mailbox
  React.useEffect(() => {
    if (!activeMailbox && mailboxes.length > 0) {
      setActiveMailbox(mailboxes[0].id);
    }
  }, [mailboxes, activeMailbox]);

  const markAsRead = async (messageId: string) => {
    try {
      await fetch(`/api/voice/mailbox/${activeMailbox}/read`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: messageId, read: true }),
      });
      refetchMessages();
    } catch (error) {
      console.error('Failed to mark message as read:', error);
    }
  };

  const deleteMessage = async (messageId: string) => {
    try {
      await fetch(`/api/voice/mailbox/${activeMailbox}/messages/${messageId}`, {
        method: 'DELETE',
      });
      refetchMessages();
    } catch (error) {
      console.error('Failed to delete message:', error);
    }
  };

  const formatDuration = (seconds: number = 0) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    
    if (isToday) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString();
  };

  const totalUnread = mailboxes.reduce((sum, mb) => sum + mb.unread, 0);

  return (
    <div className="h-[calc(100vh-80px)]">
      {/* Header */}
      <div className="border-b bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Voicemail</h1>
            <p className="text-sm text-gray-500">
              {totalUnread > 0 ? `${totalUnread} unread message${totalUnread > 1 ? 's' : ''}` : 'All caught up'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="flex items-center gap-1">
              <Phone className="h-3 w-3" />
              {mailboxes.length} mailbox{mailboxes.length !== 1 ? 'es' : ''}
            </Badge>
            <Badge variant="outline" className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {messages.length} message{messages.length !== 1 ? 's' : ''}
            </Badge>
          </div>
        </div>
      </div>

      <div className="flex h-full">
        {/* Sidebar: Mailbox List */}
        <div className="w-80 border-r bg-gray-50 overflow-y-auto">
          <div className="p-4">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Mailboxes</h2>
            <div className="space-y-2">
              {mailboxes.map((mailbox) => (
                <button
                  key={mailbox.id}
                  onClick={() => setActiveMailbox(mailbox.id)}
                  className={`w-full text-left p-3 rounded-lg transition-colors ${
                    activeMailbox === mailbox.id
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-white hover:bg-gray-100 border border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      <span className="font-medium">{mailbox.label}</span>
                    </div>
                    {mailbox.unread > 0 && (
                      <Badge 
                        variant={activeMailbox === mailbox.id ? "secondary" : "destructive"}
                        className="text-xs"
                      >
                        {mailbox.unread}
                      </Badge>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Main Content: Messages */}
        <div className="flex-1 overflow-y-auto">
          {!activeMailbox ? (
            <div className="flex items-center justify-center h-full text-gray-500">
              <div className="text-center">
                <Phone className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>Select a mailbox to view messages</p>
              </div>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-500">
              <div className="text-center">
                <Clock className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No voicemail messages</p>
                <p className="text-sm">Messages will appear here when received</p>
              </div>
            </div>
          ) : (
            <div className="p-6">
              <div className="space-y-4">
                {messages.map((message) => (
                  <Card key={message.id} className={`p-4 ${!message.read ? 'border-blue-500 bg-blue-50' : ''}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Phone className="h-4 w-4 text-gray-400" />
                          <span className="font-medium text-gray-900">
                            {message.from || 'Unknown Number'}
                          </span>
                          {!message.read && (
                            <Badge variant="destructive" className="text-xs">
                              New
                            </Badge>
                          )}
                          <Badge variant="outline" className="text-xs flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(message.createdAt)}
                          </Badge>
                        </div>
                        
                        <div className="flex items-center gap-4 mb-3">
                          <div className="flex items-center gap-1 text-sm text-gray-500">
                            <Clock className="h-3 w-3" />
                            {formatDuration(message.durationSec)}
                          </div>
                          {message.tenant && (
                            <Badge variant="outline" className="text-xs">
                              {message.tenant.toUpperCase()}
                            </Badge>
                          )}
                        </div>

                        {message.transcriptionText && (
                          <div className="bg-gray-100 rounded-lg p-3 mb-3">
                            <p className="text-sm text-gray-700">{message.transcriptionText}</p>
                          </div>
                        )}

                        <div className="flex items-center gap-2">
                          <audio 
                            controls 
                            src={`${message.recordingUrl}.mp3`}
                            className="h-8"
                            onPlay={() => !message.read && markAsRead(message.id)}
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-2 ml-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(`${message.recordingUrl}.mp3`, '_blank')}
                          className="flex items-center gap-1"
                        >
                          <Download className="h-3 w-3" />
                          Download
                        </Button>
                        
                        {!message.read && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => markAsRead(message.id)}
                          >
                            Mark Read
                          </Button>
                        )}
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteMessage(message.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}