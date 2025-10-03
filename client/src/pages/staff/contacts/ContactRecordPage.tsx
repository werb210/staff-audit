import React from 'react';
import { useRoute } from 'wouter';
import ContactRecord from '@/components/contacts/ContactRecord';

export default function ContactRecordPage() {
  const [match] = useRoute('/staff/contacts/:id');
  const id = match?.id;
  
  if (!id) {
    return (
      <div className="p-6">
        <div className="text-center">
          <h2 className="text-xl font-semibold">Contact Not Found</h2>
          <p className="text-gray-600">No contact ID provided</p>
        </div>
      </div>
    );
  }

  return <ContactRecord contactId={id} />;
}