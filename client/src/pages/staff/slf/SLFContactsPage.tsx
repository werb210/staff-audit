import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/queryClient';
import { useState } from 'react';
import SiloSwitcher from '@/components/layout/SiloSwitcher';
// import { startCall } from '@/lib/api/voice'; // Removed unused import
// Removed unused useSilo import
import AiActions from '@/components/ai/AiActions';
import { lower } from '@/lib/dedupe';

interface SLFContact {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  company: string;
  title?: string;
  status: string;
  source: string;
  createdAt: string;
}

export default function SLFContactsPage() {
  // Removed unused silo variable
  const [searchQuery, setSearchQuery] = useState('');
  
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['slf-external-contacts'],
    queryFn: async () => {
      const json = await api('/api/slf/contacts');
      return json;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 3
  });

  const filteredContacts = (data?.items || []).filter((contact: SLFContact) =>
    lower(contact.name).includes(lower(searchQuery)) ||
    lower(contact.email).includes(lower(searchQuery)) ||
    lower(contact.company).includes(lower(searchQuery))
  );

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h2 className="text-lg font-semibold text-blue-800 mb-2">
            🔵 SLF (Site Level Financial) - CONTACTS
          </h2>
          <p className="text-blue-600">Loading live contacts from external SLF system...</p>
        </div>
        <div className="animate-pulse space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h2 className="text-lg font-semibold text-blue-800 mb-2">
            🔵 SLF (Site Level Financial) - CONTACTS
          </h2>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-red-800 font-semibold mb-2">External API Error</h3>
          <p className="text-red-600 mb-2">
            Unable to connect to SLF external system: {error?.message}
          </p>
          <p className="text-sm text-red-500">
            Please check your network connection or contact system administrator.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* SLF Header Banner with Silo Switcher */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold text-blue-800">
            🔵 SLF (Site Level Financial) - CONTACTS
          </h2>
          <SiloSwitcher />
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
              External API Data
            </span>
            <span className="text-blue-600 text-sm">
              {data?.count || 0} contacts loaded from SLF system
            </span>
          </div>
          <div className="text-xs text-blue-500">
            Last updated: {data?.timestamp ? new Date(data.timestamp).toLocaleTimeString() : 'Unknown'}
          </div>
        </div>
      </div>

      {/* Search Filter */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Search SLF contacts by name, email, or company..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {/* Read-Only Notice */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-6">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <span className="text-yellow-800 font-medium">Read-Only External Data</span>
        </div>
        <p className="text-yellow-700 text-sm mt-1">
          These contacts are sourced from the external SLF system and cannot be edited through this interface.
        </p>
      </div>

      {/* AI Actions for Contacts */}
      {filteredContacts.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-md font-medium mb-3 text-blue-800">Contact AI Actions</h3>
          <p className="text-sm text-blue-600 mb-3">
            Select a contact and use AI to compose communications or perform compliance checks:
          </p>
          <AiActions
            ctx={{ 
              contactId: filteredContacts[0]?.id, // Use first contact as example
            }}
            actions={["compose_email","compose_sms","aml"]}
            dense={true}
          />
        </div>
      )}

      {/* Contacts Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Company
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Source
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredContacts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    {searchQuery ? 'No contacts match your search criteria' : 'No contacts available from SLF external system'}
                  </td>
                </tr>
              ) : (
                filteredContacts.map((contact: SLFContact) => (
                  <tr key={contact.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{contact.name}</div>
                        <div className="text-sm text-gray-500">{contact.email}</div>
                        <div className="text-sm text-gray-500">{contact.phone}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{contact.company}</div>
                      {contact.title && (
                        <div className="text-sm text-gray-500">{contact.title}</div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        contact.status === 'approved' ? 'bg-green-100 text-green-800' :
                        contact.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        contact.status === 'rejected' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {contact.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
                        {contact.source}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(contact.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            // startCall({ to: contact.phone }); // Disabled for now
                            alert(`Would call ${contact.phone}`);
                          }}
                          disabled={!contact.phone}
                          className="inline-flex items-center px-2 py-1 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed rounded-md transition-colors"
                          title={contact.phone ? `Call ${contact.name}` : 'No phone number available'}
                        >
                          <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z"/>
                          </svg>
                          Call
                        </button>
                        
                        {/* Individual Contact AI Actions */}
                        <div className="flex gap-1">
                          <AiActions
                            ctx={{ contactId: contact.id }}
                            actions={["compose_email"]}
                            dense={true}
                          />
                        </div>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer Stats */}
      <div className="mt-6 text-center text-sm text-gray-500">
        Showing {filteredContacts.length} of {data?.count || 0} contacts from SLF external system
      </div>
    </div>
  );
}