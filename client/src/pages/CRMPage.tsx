// client/src/pages/CRMPage.tsx
import React, { useEffect, useState } from 'react';
import Dialer from '../components/Dialer';

interface Contact {
  id: string;
  name: string;
  phone: string;
  email: string;
  company: string;
}

const CRMPage: React.FC = () => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [showDialer, setShowDialer] = useState(false);
  const [activeContact, setActiveContact] = useState<Contact | null>(null);

  useEffect(() => {
    const fetchContacts = async () => {
      const res = await fetch('/api/contacts');
      const data = await res.json();
      setContacts(data.contacts || []);
    };
    fetchContacts();
  }, []);

  const handleCall = (contact: Contact) => {
    setActiveContact(contact);
    setShowDialer(true);
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Contacts</h1>
      {contacts.length === 0 ? (
        <p>No contacts available.</p>
      ) : (
        <table className="min-w-full border">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-2 border">Name</th>
              <th className="p-2 border">Company</th>
              <th className="p-2 border">Phone</th>
              <th className="p-2 border">Email</th>
              <th className="p-2 border">Actions</th>
            </tr>
          </thead>
          <tbody>
            {contacts.map(contact => (
              <tr key={contact.id}>
                <td className="p-2 border">{contact.name}</td>
                <td className="p-2 border">{contact.company}</td>
                <td className="p-2 border">{contact.phone}</td>
                <td className="p-2 border">{contact.email}</td>
                <td className="p-2 border">
                  <button
                    onClick={() => handleCall(contact)}
                    className="mr-2 px-2 py-1 bg-blue-500 text-white rounded"
                  >
                    Call
                  </button>
                  <button className="mr-2 px-2 py-1 bg-green-500 text-white rounded">
                    SMS
                  </button>
                    <button className="px-2 py-1 bg-gray-700 text-white rounded">
                      Email
                    </button>
                  </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {showDialer && activeContact && (
        <Dialer
          contact={activeContact}
          onClose={() => setShowDialer(false)}
        />
      )}
    </div>
  );
};

export default CRMPage;
