import { useEffect, useState } from 'react';
import { api } from '@/lib/queryClient';
import { Button } from '../../../components/ui/button';
import { Textarea } from '../../../components/ui/textarea';
import { Input } from '../../../components/ui/input';

interface Email {
  id: string;
  from: string;
  to: string;
  subject: string;
  body: string;
  timestamp: string;
  status: 'sent' | 'pending' | 'failed';
}

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
}

export default function EmailPage() {
  const [emails, setEmails] = useState<Email[]>([]);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [composing, setComposing] = useState(false);
  const [emailForm, setEmailForm] = useState({
    to: '',
    subject: '',
    body: ''
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadEmails();
    loadTemplates();
  }, []);

  const loadEmails = async () => {
    try {
      const response = await api('/api/communications/emails');
      setEmails(response.items || []);
    } catch (error) {
      console.error('Failed to load emails:', error);
    }
  };

  const loadTemplates = async () => {
    try {
      const response = await api('/api/communications/email-templates');
      setTemplates(response.items || []);
    } catch (error) {
      console.error('Failed to load templates:', error);
    }
  };

  const sendEmail = async () => {
    if (!emailForm.to || !emailForm.subject || !emailForm.body) return;
    
    setLoading(true);
    try {
      await api('/api/communications/send-email', {
        method: 'POST',
        body: emailForm
      });
      
      setEmailForm({ to: '', subject: '', body: '' });
      setComposing(false);
      await loadEmails();
    } catch (error) {
      console.error('Failed to send email:', error);
    } finally {
      setLoading(false);
    }
  };

  const useTemplate = (template: EmailTemplate) => {
    setEmailForm({
      ...emailForm,
      subject: template.subject,
      body: template.body
    });
  };

  return (
    <div className="flex h-[calc(100vh-120px)]">
      {/* Left Panel: Email List */}
      <div className="w-80 border-r bg-gray-50 overflow-y-auto">
        <div className="p-4 border-b bg-white">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold">Email Center</h2>
            <Button
              size="sm"
              onClick={() => setComposing(!composing)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              + Compose
            </Button>
          </div>
        </div>
        
        <div className="p-2">
          {emails.map((email) => (
            <div
              key={email.id}
              onClick={() => setSelectedEmail(email)}
              className={`p-3 rounded-lg cursor-pointer mb-2 transition-colors ${
                selectedEmail?.id === email.id 
                  ? 'bg-blue-100 border border-blue-200' 
                  : 'bg-white hover:bg-gray-100 border border-gray-200'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="font-medium text-sm truncate">{email.to}</div>
                <div className={`text-xs px-2 py-1 rounded ${
                  email.status === 'sent' ? 'bg-green-100 text-green-700' :
                  email.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  {email.status}
                </div>
              </div>
              <div className="font-medium text-gray-900 truncate">{email.subject}</div>
              <div className="text-xs text-gray-500">
                {new Date(email.timestamp).toLocaleDateString()}
              </div>
            </div>
          ))}
          {emails.length === 0 && (
            <div className="text-center text-gray-500 py-8">
              No emails sent yet
            </div>
          )}
        </div>
      </div>

      {/* Right Panel: Email View/Compose */}
      <div className="flex-1 flex flex-col">
        {composing ? (
          <div className="flex-1 flex flex-col">
            {/* Compose Header */}
            <div className="p-4 border-b bg-white">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Compose Email</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setComposing(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>

            {/* Templates */}
            {templates.length > 0 && (
              <div className="p-4 border-b bg-gray-50">
                <div className="text-sm font-medium mb-2">Quick Templates:</div>
                <div className="flex flex-wrap gap-2">
                  {templates.map((template) => (
                    <Button
                      key={template.id}
                      variant="outline"
                      size="sm"
                      onClick={() => useTemplate(template)}
                    >
                      {template.name}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Compose Form */}
            <div className="flex-1 p-4 space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">To:</label>
                <Input
                  type="email"
                  value={emailForm.to}
                  onChange={(e) => setEmailForm({ ...emailForm, to: e.target.value })}
                  placeholder="recipient@example.com"
                  className="mt-1"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-700">Subject:</label>
                <Input
                  value={emailForm.subject}
                  onChange={(e) => setEmailForm({ ...emailForm, subject: e.target.value })}
                  placeholder="Email subject"
                  className="mt-1"
                />
              </div>
              
              <div className="flex-1">
                <label className="text-sm font-medium text-gray-700">Message:</label>
                <Textarea
                  value={emailForm.body}
                  onChange={(e) => setEmailForm({ ...emailForm, body: e.target.value })}
                  placeholder="Type your message..."
                  className="mt-1 min-h-[300px] resize-none"
                />
              </div>
            </div>

            {/* Send Button */}
            <div className="p-4 border-t bg-white">
              <div className="flex justify-end">
                <Button
                  onClick={sendEmail}
                  disabled={loading || !emailForm.to || !emailForm.subject || !emailForm.body}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {loading ? 'Sending...' : 'Send Email'}
                </Button>
              </div>
            </div>
          </div>
        ) : selectedEmail ? (
          <div className="flex-1 flex flex-col">
            {/* Email Header */}
            <div className="p-4 border-b bg-white">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold">{selectedEmail.subject}</h3>
                <div className={`text-xs px-2 py-1 rounded ${
                  selectedEmail.status === 'sent' ? 'bg-green-100 text-green-700' :
                  selectedEmail.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  {selectedEmail.status}
                </div>
              </div>
              <div className="text-sm text-gray-600">
                <div>To: {selectedEmail.to}</div>
                <div>From: {selectedEmail.from}</div>
                <div>Date: {new Date(selectedEmail.timestamp).toLocaleString()}</div>
              </div>
            </div>

            {/* Email Body */}
            <div className="flex-1 p-4 bg-gray-50">
              <div className="bg-white rounded p-4 whitespace-pre-wrap">
                {selectedEmail.body}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <div className="text-2xl mb-2">📧</div>
              <div>Select an email to view or compose a new one</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}