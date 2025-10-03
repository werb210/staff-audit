import { useState, useMemo } from 'react';
import { useToast } from '@/hooks/use-toast';
import { 
  formatPhoneNumber, 
  isValidPhoneNumber, 
  getPhoneFormatHint,
  normalizePhoneNumber 
} from '@/lib/phoneUtils';
import ComposerDrawer from '@/components/composer/ComposerDrawer';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/queryClient';
import { lower } from '@/lib/dedupe';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';

const CONTACT_STATUS_OPTIONS = [
  { value: 'lead', label: 'Lead' },
  { value: 'active', label: 'Active' },
  { value: 'customer', label: 'Customer' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'lender', label: 'Lender' },
  { value: 'referrer', label: 'Referrer' },
  { value: 'staff', label: 'Staff' },
  { value: 'non_marketing', label: 'Non-Marketing' }
];

interface Contact {
  id: string;
  name: string;
  email: string;
  phone: string;
  company?: string;
  status: 'lead' | 'active' | 'customer' | 'inactive' | 'lender' | 'referrer' | 'staff' | 'non_marketing';
  lastContact?: string;
  notes?: string;
  createdAt: string;
}

interface ContactForm {
  name: string;
  email: string;
  phone: string;
  company: string;
  status: string;
  notes: string;
}

export default function ContactsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Composer Drawer state
  const [showComposer, setShowComposer] = useState(false);
  const [composerContact, setComposerContact] = useState<Contact | null>(null);
  
  // Use React Query for contacts data with defensive response handling
  const { data: contactsResponse, isLoading, refetch } = useQuery({
    queryKey: ['/api/contacts'],
    queryFn: async () => {
      const res = await api('/api/contacts');
      // Handle both array and wrapped response formats
      return Array.isArray(res) ? res : res?.items ?? res?.results ?? res?.contacts ?? [];
    }
  });


  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeStatus, setActiveStatus] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [contactForm, setContactForm] = useState<ContactForm>({
    name: '',
    email: '',
    phone: '',
    company: '',
    status: 'lead',
    notes: ''
  });

  // Removed unused action handlers - actions accessed via tabbed interface

  const handleSaveContact = async () => {
    console.log('💾 Save contact clicked');
    try {
      const method = editingContact ? 'PUT' : 'POST';
      const url = editingContact ? `/api/contacts/${editingContact.id}` : '/api/contacts';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(contactForm),
      });

      if (!response.ok) throw new Error('Failed to save contact');

      toast({
        title: editingContact ? "Contact Updated" : "Contact Created",
        description: `${contactForm.name} has been ${editingContact ? 'updated' : 'added'} successfully`,
      });

      setShowForm(false);
      setEditingContact(null);
      setContactForm({
        name: '',
        email: '',
        phone: '',
        company: '',
        status: 'lead',
        notes: ''
      });
      
      // Refresh contacts list using React Query
      await queryClient.invalidateQueries({ queryKey: ['/api/contacts'] });
      await refetch();
    } catch (error) {
      console.error('Save error:', error);
      toast({
        title: "Error",
        description: "Failed to save contact. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Convert API contacts to our Contact format - now contactsResponse is already normalized
  const formattedContacts = useMemo(() => {
    if (!contactsResponse || !Array.isArray(contactsResponse)) return [];
    
    return contactsResponse.map((c: any) => ({
      id: c.id || '',
      name: c.name || (c.firstName && c.lastName ? `${c.firstName} ${c.lastName}` : c.firstName || c.lastName || c.email || 'Unknown'),
      email: c.email || '',
      phone: c.phone || '',
      company: c.company || '',
      status: (c.status as any) || 'active',
      lastContact: c.updatedAt || '',
      notes: c.notes || '',
      createdAt: c.createdAt || new Date().toISOString()
    }));
  }, [contactsResponse]);

  // Filter contacts based on search and status - null-safe implementation
  const safeText = (v?: string) => lower((v ?? '').toString().trim());
  
  const filteredContacts = useMemo(() => {
    if (!Array.isArray(formattedContacts)) return [];
    return formattedContacts.filter((contact: Contact) => {
    if (!contact) return false;
    
    const matchesSearch = !searchTerm || safeText(contact.name).includes(safeText(searchTerm)) || 
                         safeText(contact.email).includes(safeText(searchTerm)) ||
                         safeText(contact.company).includes(safeText(searchTerm));
    const matchesStatus = !activeStatus || contact.status === activeStatus;
    
    return matchesSearch && matchesStatus;
    });
  }, [formattedContacts, searchTerm, activeStatus]);

  return (
    <div>
      <div className="flex flex-col h-[calc(100vh-120px)]">
      
      <div className="flex flex-1">
        {/* Left Panel: Contact List */}
        <div className="w-80 border-r bg-gray-50 overflow-y-auto">
        <div className="p-4 border-b bg-white">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Contacts ({formattedContacts.length})</h2>
            <div className="flex items-center gap-2">
              {/* SiloSwitcher moved to global header */}
              <Button
                size="sm"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('+ Add button clicked');
                  setShowForm(true);
                }}
                className="bg-blue-600 hover:bg-blue-700"
              >
                + Add
              </Button>
            </div>
          </div>
          {isLoading && (
            <div className="text-xs text-gray-500 mb-2">Loading contacts...</div>
          )}
          
          {/* Search */}
          <Input
            placeholder="Search contacts..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="mb-3"
          />
          
          {/* Status Filter */}
          <select
            value={activeStatus}
            onChange={(e) => setActiveStatus(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="">All Statuses</option>
            {CONTACT_STATUS_OPTIONS.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>
        </div>
        
        <div className="p-2">
          {filteredContacts.map((contact) => (
            <div
              key={contact.id}
              onClick={() => setSelectedContact(contact)}
              className={`p-4 mb-3 rounded-lg cursor-pointer transition-all duration-200 ${
                selectedContact?.id === contact.id
                  ? 'bg-blue-50 border-blue-300 border-2 shadow-sm'
                  : 'bg-white border border-gray-200 hover:bg-gray-50 hover:border-gray-300 hover:shadow-sm'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="font-semibold text-sm text-gray-900 truncate">{contact.name}</div>
                    <span className={`px-1.5 py-0.5 rounded-full text-xs font-medium ${
                      contact.status === 'active' ? 'bg-green-100 text-green-700' :
                      contact.status === 'lead' ? 'bg-blue-100 text-blue-700' :
                      contact.status === 'customer' ? 'bg-purple-100 text-purple-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {contact.status}
                    </span>
                  </div>
                  <div className="text-xs text-gray-600 truncate mb-1">{contact.email}</div>
                  {contact.company && (
                    <div className="text-xs text-gray-500 truncate mb-2">🏢 {contact.company}</div>
                  )}
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-gray-400">
                      {contact.lastContact 
                        ? `Last: ${new Date(contact.lastContact).toLocaleDateString()}`
                        : 'No recent contact'
                      }
                    </div>
                    {contact.phone && (
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          console.log('📞 Quick call button clicked for:', contact.name);
                          try {
                            if ((window as any).openDialer) {
                              (window as any).openDialer(contact.phone);
                            } else {
                              window.open(`tel:${contact.phone}`, '_self');
                            }
                            toast({
                              title: "📞 Quick Call",
                              description: `Calling ${contact.name}...`
                            });
                          } catch (error) {
                            console.error('Quick call error:', error);
                            toast({
                              title: "Call Failed",
                              description: "Unable to initiate call.",
                              variant: "destructive"
                            });
                          }
                        }}
                        className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                        title="Quick Call"
                      >
                        📞
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
          {!isLoading && filteredContacts.length === 0 && (
            <div className="text-center text-gray-500 py-8">
              {searchTerm || activeStatus ? 'No contacts match your search' : 'No contacts yet'}
            </div>
          )}
        </div>
      </div>

      {/* Right Panel: HubSpot-Style Contact Details */}
      {selectedContact ? (
        <div id="contact-detail-panel" className="flex-1 bg-white flex flex-col relative">
          {/* Contact Header with Actions */}
          <div className="p-6 border-b">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="text-2xl font-bold text-gray-900">{selectedContact.name}</h3>
                <p className="text-gray-600">{selectedContact.company}</p>
                <div className="flex items-center gap-3 mt-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    selectedContact.status === 'active' ? 'bg-green-100 text-green-800' :
                    selectedContact.status === 'lead' ? 'bg-blue-100 text-blue-800' :
                    selectedContact.status === 'customer' ? 'bg-purple-100 text-purple-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {selectedContact.status}
                  </span>
                  {selectedContact.email && (
                    <span className="text-sm text-gray-500">✉ {selectedContact.email}</span>
                  )}
                  {selectedContact.phone && (
                    <span className="text-sm text-gray-500">📞 {selectedContact.phone}</span>
                  )}
                </div>
              </div>
              
              {/* top-right action chips removed per design */}
            </div>
          </div>

          {/* standalone Create Application button removed per design */}

          {/* Tabbed Content Area */}
          <div className="flex-1 overflow-hidden">
            <div className="border-b">
              <div className="flex space-x-8 px-6">
                <button className="py-4 px-2 border-b-2 border-blue-500 font-medium text-blue-600 text-sm">
                  Overview
                </button>
                <button className="py-4 px-2 font-medium text-gray-500 hover:text-gray-700 text-sm">
                  Activity
                </button>
                <button className="py-4 px-2 font-medium text-gray-500 hover:text-gray-700 text-sm">
                  Applications
                </button>
                <button className="py-4 px-2 font-medium text-gray-500 hover:text-gray-700 text-sm">
                  Documents
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6 overflow-y-auto">
              {/* Contact Information Cards */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-3">Contact Details</h4>
                  <div className="space-y-2">
                    <div>
                      <span className="text-sm text-gray-500">Email:</span>
                      <div className="font-medium">{selectedContact.email}</div>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500">Phone:</span>
                      <div className="font-medium">{selectedContact.phone || '—'}</div>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500">Company:</span>
                      <div className="font-medium">{selectedContact.company || '—'}</div>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-3">Engagement Summary</h4>
                  <div className="space-y-2">
                    <div>
                      <span className="text-sm text-gray-500">Last Contact:</span>
                      <div className="text-sm">
                        {selectedContact.lastContact 
                          ? new Date(selectedContact.lastContact).toLocaleDateString()
                          : '—'
                        }
                      </div>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500">Total Interactions:</span>
                      <div className="font-medium">12</div>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500">Applications:</span>
                      <div className="font-medium">2 active</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Activity Timeline */}
              <div className="bg-white border rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-4">Recent Activity</h4>
                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                    <div className="flex-1">
                      <div className="text-sm font-medium">Email sent: Rate sheet requested</div>
                      <div className="text-xs text-gray-500">2 hours ago</div>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                    <div className="flex-1">
                      <div className="text-sm font-medium">Call completed: 8 minutes</div>
                      <div className="text-xs text-gray-500">Yesterday</div>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-purple-500 rounded-full mt-2"></div>
                    <div className="flex-1">
                      <div className="text-sm font-medium">Application submitted: $50K equipment loan</div>
                      <div className="text-xs text-gray-500">3 days ago</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Actions section removed per design */}

              {selectedContact.notes && (
                <div className="bg-white border rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-3">Notes</h4>
                  <div className="text-sm text-gray-600 whitespace-pre-wrap bg-gray-50 p-3 rounded">
                    {selectedContact.notes}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-gray-500">
            <div className="text-lg mb-2">👥</div>
            <p>Select a contact to view details</p>
          </div>
        </div>
      )}
      </div>

      {/* Contact Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">
              {editingContact ? 'Edit Contact' : 'Add New Contact'}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <Input
                  value={contactForm.name}
                  onChange={(e) => setContactForm({...contactForm, name: e.target.value})}
                  placeholder="Contact name"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <Input
                  type="email"
                  value={contactForm.email}
                  onChange={(e) => setContactForm({...contactForm, email: e.target.value})}
                  placeholder="email@example.com"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <Input
                  type="tel"
                  value={contactForm.phone}
                  onChange={(e) => {
                    const formatted = formatPhoneNumber(e.target.value);
                    setContactForm({...contactForm, phone: formatted});
                  }}
                  onBlur={(e) => {
                    const normalized = normalizePhoneNumber(e.target.value);
                    setContactForm({...contactForm, phone: normalized});
                  }}
                  placeholder="+1234567890"
                  className={
                    contactForm.phone && !isValidPhoneNumber(contactForm.phone) 
                      ? "border-red-300 focus:border-red-500" 
                      : ""
                  }
                />
                {contactForm.phone && (
                  <p className="text-xs text-gray-600 mt-1">
                    {getPhoneFormatHint(contactForm.phone)}
                  </p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
                <Input
                  value={contactForm.company}
                  onChange={(e) => setContactForm({...contactForm, company: e.target.value})}
                  placeholder="Company name"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={contactForm.status}
                  onChange={(e) => setContactForm({...contactForm, status: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  {CONTACT_STATUS_OPTIONS.map((status) => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={contactForm.notes}
                  onChange={(e) => setContactForm({...contactForm, notes: e.target.value})}
                  placeholder="Additional notes..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  rows={3}
                />
              </div>
            </div>
            
            <div className="flex justify-end gap-2 mt-6">
              <Button
                variant="outline"
                onClick={() => {
                  setShowForm(false);
                  setEditingContact(null);
                  setContactForm({
                    name: '',
                    email: '',
                    phone: '',
                    company: '',
                    status: 'lead',
                    notes: ''
                  });
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveContact}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {editingContact ? 'Update' : 'Create'} Contact
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Composer Drawer */}
      <ComposerDrawer
        open={showComposer}
        onClose={() => {
          setShowComposer(false);
          setComposerContact(null);
        }}
        contact={composerContact}
      />

      </div>
    </div>
  );
}