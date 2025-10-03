import { useEffect, useState } from 'react';
import { api } from '@/lib/queryClient';
import { Button } from '../../../components/ui/button';
import { Textarea } from '../../../components/ui/textarea';

interface Contact {
  id: string;
  name: string;
  phone: string;
  email?: string;
}

interface Message {
  id: string;
  from_id: string;
  to_id: string;
  body: string;
  timestamp: string;
  direction: 'inbound' | 'outbound';
}

function MessageBubble({ message, isOutgoing }: { message: Message; isOutgoing: boolean }) {
  return (
    <div className={`max-w-[70%] p-3 rounded-lg shadow text-sm ${
      isOutgoing 
        ? 'bg-blue-600 text-white ml-auto'
        : 'bg-gray-100 text-gray-900 mr-auto'
    }`}>
      <div>{message.body}</div>
      <div className={`text-xs mt-1 ${isOutgoing ? 'text-blue-100' : 'text-gray-500'}`}>
        {new Date(message.timestamp).toLocaleTimeString()}
      </div>
    </div>
  );
}

export default function ChatPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageBody, setMessageBody] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadContacts();
  }, []);

  useEffect(() => {
    if (selectedContact) {
      loadMessages(selectedContact.id);
    }
  }, [selectedContact]);

  const loadContacts = async () => {
    try {
      const response = await api('/api/contacts');
      setContacts(response.items || []);
    } catch (error) {
      console.error('Failed to load contacts:', error);
    }
  };

  const loadMessages = async (contactId: string) => {
    try {
      const response = await api(`/api/communications/messages/${contactId}`);
      setMessages(response.items || []);
    } catch (error) {
      console.error('Failed to load messages:', error);
      setMessages([]);
    }
  };

  const sendMessage = async () => {
    if (!messageBody.trim() || !selectedContact) return;
    
    setLoading(true);
    try {
      await api('/api/communications/send-sms', {
        method: 'POST',
        body: {
          to: selectedContact.phone,
          body: messageBody,
          contact_id: selectedContact.id
        }
      });
      
      setMessageBody('');
      // Reload messages to show the sent message
      await loadMessages(selectedContact.id);
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-120px)]">
      {/* Left Panel: Contact List */}
      <div className="w-80 border-r bg-gray-50 overflow-y-auto">
        <div className="p-4 border-b bg-white">
          <h2 className="text-lg font-semibold">Conversations</h2>
        </div>
        <div className="p-2">
          {contacts.map((contact) => (
            <div
              key={contact.id}
              onClick={() => setSelectedContact(contact)}
              className={`p-3 rounded-lg cursor-pointer mb-2 transition-colors ${
                selectedContact?.id === contact.id 
                  ? 'bg-blue-100 border border-blue-200' 
                  : 'bg-white hover:bg-gray-100 border border-gray-200'
              }`}
            >
              <div className="font-medium text-gray-900">{contact.name}</div>
              <div className="text-sm text-gray-500">{contact.phone}</div>
              {contact.email && (
                <div className="text-xs text-gray-400">{contact.email}</div>
              )}
            </div>
          ))}
          {contacts.length === 0 && (
            <div className="text-center text-gray-500 py-8">
              No contacts available
            </div>
          )}
        </div>
      </div>

      {/* Right Panel: Message Thread */}
      <div className="flex-1 flex flex-col">
        {selectedContact ? (
          <>
            {/* Header */}
            <div className="p-4 border-b bg-white">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">{selectedContact.name}</h3>
                  <div className="text-sm text-gray-500">{selectedContact.phone}</div>
                </div>
                <div className="text-xs text-gray-400">
                  SMS via Twilio
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
              {messages.map((message) => (
                <MessageBubble 
                  key={message.id}
                  message={message}
                  isOutgoing={message.direction === 'outbound'}
                />
              ))}
              {messages.length === 0 && (
                <div className="text-center text-gray-500 py-8">
                  No messages yet. Start the conversation!
                </div>
              )}
            </div>

            {/* Message Composer */}
            <div className="p-4 border-t bg-white">
              <div className="flex gap-2">
                <Textarea
                  placeholder="Type your message..."
                  value={messageBody}
                  onChange={(e) => setMessageBody(e.target.value)}
                  className="flex-1 min-h-[60px] resize-none"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                />
                <Button
                  onClick={sendMessage}
                  disabled={loading || !messageBody.trim()}
                  className="self-end"
                >
                  {loading ? 'Sending...' : 'Send'}
                </Button>
              </div>
              <div className="text-xs text-gray-500 mt-2">
                Press Enter to send, Shift+Enter for new line
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <div className="text-2xl mb-2">💬</div>
              <div>Select a contact to start messaging</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}