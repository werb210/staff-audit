// client/src/pages/DocumentsPage.tsx
import React, { useEffect, useState } from 'react';

interface Document {
  id: string;
  name: string;
  category: string;
  status: string; // pending | accepted | rejected
}

const DocumentsPage: React.FC = () => {
  const [documents, setDocuments] = useState<Document[]>([]);

  useEffect(() => {
    const fetchDocs = async () => {
      const res = await fetch('/api/documents');
      const data = await res.json();
      setDocuments(data.documents || []);
    };
    fetchDocs();
  }, []);

  const changeStatus = async (id: string, status: string) => {
    await fetch(`/api/documents/${id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    setDocuments(docs =>
      docs.map(doc => (doc.id === id ? { ...doc, status } : doc))
    );
  };

  const grouped = documents.reduce<Record<string, Document[]>>((acc, doc) => {
    if (!acc[doc.category]) acc[doc.category] = [];
    acc[doc.category].push(doc);
    return acc;
  }, {});

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Documents</h1>
      {Object.entries(grouped).map(([category, docs]) => (
        <div key={category} className="mb-6">
          <h2 className="font-semibold text-lg">{category}</h2>
          <ul>
            {docs.map(doc => (
              <li key={doc.id} className="flex justify-between items-center border-b py-2">
                <span>{doc.name} <em>({doc.status})</em></span>
                <div>
                  <button
                    onClick={() => changeStatus(doc.id, 'accepted')}
                    className="px-2 py-1 mr-2 rounded bg-green-500 text-white"
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => changeStatus(doc.id, 'rejected')}
                    className="px-2 py-1 rounded bg-red-500 text-white"
                  >
                    Reject
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
};

export default DocumentsPage;
