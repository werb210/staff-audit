import { useEffect, useState } from 'react';
import { api } from '@/lib/queryClient';
import { lower } from '@/lib/dedupe';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';

interface Document {
  id: string;
  name: string;
  type: string;
  size: number;
  status: 'pending' | 'approved' | 'rejected' | 'processing';
  applicationId?: string;
  contactName?: string;
  uploadedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  url?: string;
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDocuments();
  }, [statusFilter]);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const response = await api(`/api/documents?status=${statusFilter}&search=${searchTerm}`);
      setDocuments(response.items || []);
    } catch (error) {
      console.error('Failed to load documents:', error);
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  };

  const updateDocumentStatus = async (documentId: string, status: 'approved' | 'rejected') => {
    try {
      await api(`/api/documents/${documentId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
        headers: { 'Content-Type': 'application/json' }
      });
      
      // Update local state
      setDocuments(docs => docs.map(doc => 
        doc.id === documentId 
          ? { ...doc, status, reviewedAt: new Date().toISOString() }
          : doc
      ));
      
      if (selectedDocument?.id === documentId) {
        setSelectedDocument(prev => prev ? {
          ...prev,
          status,
          reviewedAt: new Date().toISOString()
        } : null);
      }
    } catch (error) {
      console.error('Failed to update document status:', error);
    }
  };

  const deleteDocument = async (documentId: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return;
    
    try {
      await api(`/api/documents/${documentId}`, { method: 'DELETE' });
      setDocuments(docs => docs.filter(doc => doc.id !== documentId));
      if (selectedDocument?.id === documentId) {
        setSelectedDocument(null);
      }
    } catch (error) {
      console.error('Failed to delete document:', error);
    }
  };

  const downloadDocument = async (doc: Document) => {
    try {
      const response = await fetch(`/api/documents/${doc.id}/download`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.name;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download document:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-700';
      case 'rejected': return 'bg-red-100 text-red-700';
      case 'pending': return 'bg-yellow-100 text-yellow-700';
      case 'processing': return 'bg-blue-100 text-blue-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const filteredDocuments = documents.filter(doc => {
    const search = lower(searchTerm || '');
    const name = lower(doc.name || '');
    const contact = lower(doc.contactName || '');
    const type = lower(doc.type || '');
    return name.includes(search) || contact.includes(search) || type.includes(search);
  });

  return (
    <div>
      <div className="flex h-[calc(100vh-120px)]">
      {/* Left Panel: Document List */}
      <div className="w-80 border-r bg-gray-50 overflow-y-auto">
        <div className="p-4 border-b bg-white">
          <h2 className="text-lg font-semibold mb-3">Documents</h2>
          
          <Input
            placeholder="Search documents..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full mb-3"
          />
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Documents</option>
            <option value="pending">Pending Review</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="processing">Processing</option>
          </select>
        </div>
        
        <div className="p-2">
          {loading ? (
            <div className="text-center text-gray-500 py-8">Loading documents...</div>
          ) : filteredDocuments.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              {searchTerm ? 'No documents match your search' : 'No documents found'}
            </div>
          ) : (
            filteredDocuments.map((document) => (
              <div
                key={document.id}
                onClick={() => setSelectedDocument(document)}
                className={`p-3 rounded-lg cursor-pointer mb-2 transition-colors ${
                  selectedDocument?.id === document.id 
                    ? 'bg-blue-100 border border-blue-200' 
                    : 'bg-white hover:bg-gray-100 border border-gray-200'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="font-medium text-gray-900 truncate">{document.name}</div>
                  <span className={`text-xs px-2 py-1 rounded ${getStatusColor(document.status)}`}>
                    {document.status}
                  </span>
                </div>
                <div className="text-sm text-gray-600 truncate">{document.type}</div>
                <div className="text-xs text-gray-500">
                  {formatFileSize(document.size)} • {new Date(document.uploadedAt).toLocaleDateString()}
                </div>
                {document.contactName && (
                  <div className="text-xs text-gray-400 truncate">{document.contactName}</div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Right Panel: Document Details */}
      <div className="flex-1 flex flex-col">
        {selectedDocument ? (
          <>
            {/* Document Header */}
            <div className="p-4 border-b bg-white">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">{selectedDocument.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-xs px-2 py-1 rounded ${getStatusColor(selectedDocument.status)}`}>
                      {selectedDocument.status}
                    </span>
                    <span className="text-sm text-gray-500">{selectedDocument.type}</span>
                    <span className="text-sm text-gray-500">{formatFileSize(selectedDocument.size)}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => downloadDocument(selectedDocument)}
                  >
                    Download
                  </Button>
                  {selectedDocument.status === 'pending' && (
                    <>
                      <Button
                        size="sm"
                        onClick={() => updateDocumentStatus(selectedDocument.id, 'approved')}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => updateDocumentStatus(selectedDocument.id, 'rejected')}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        Reject
                      </Button>
                    </>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => deleteDocument(selectedDocument.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </div>

            {/* Document Details */}
            <div className="flex-1 p-4 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Document Information</h4>
                  <div className="space-y-2">
                    <div>
                      <span className="text-sm text-gray-500">Type:</span>
                      <div className="text-sm">{selectedDocument.type}</div>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500">Size:</span>
                      <div className="text-sm">{formatFileSize(selectedDocument.size)}</div>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500">Uploaded:</span>
                      <div className="text-sm">{new Date(selectedDocument.uploadedAt).toLocaleString()}</div>
                    </div>
                    {selectedDocument.reviewedAt && (
                      <div>
                        <span className="text-sm text-gray-500">Reviewed:</span>
                        <div className="text-sm">{new Date(selectedDocument.reviewedAt).toLocaleString()}</div>
                      </div>
                    )}
                  </div>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Application Details</h4>
                  <div className="space-y-2">
                    <div>
                      <span className="text-sm text-gray-500">Application ID:</span>
                      <div className="text-sm">{selectedDocument.applicationId || '—'}</div>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500">Contact:</span>
                      <div className="text-sm">{selectedDocument.contactName || '—'}</div>
                    </div>
                    {selectedDocument.reviewedBy && (
                      <div>
                        <span className="text-sm text-gray-500">Reviewed By:</span>
                        <div className="text-sm">{selectedDocument.reviewedBy}</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Document Preview Area */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Document Preview</h4>
                <div className="border rounded-lg p-4 bg-gray-50 text-center text-gray-500">
                  {selectedDocument.type.includes('pdf') ? (
                    <div>
                      <div className="text-4xl mb-2">📄</div>
                      <div>PDF Document</div>
                      <div className="text-sm">Click Download to view</div>
                    </div>
                  ) : selectedDocument.type.includes('image') ? (
                    <div>
                      <div className="text-4xl mb-2">🖼️</div>
                      <div>Image Document</div>
                      <div className="text-sm">Click Download to view</div>
                    </div>
                  ) : (
                    <div>
                      <div className="text-4xl mb-2">📎</div>
                      <div>Document</div>
                      <div className="text-sm">Click Download to view</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Quick Actions */}
              {selectedDocument.status === 'pending' && (
                <div className="border-t pt-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Quick Actions</h4>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => updateDocumentStatus(selectedDocument.id, 'approved')}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      ✓ Approve Document
                    </Button>
                    <Button
                      onClick={() => updateDocumentStatus(selectedDocument.id, 'rejected')}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      ✗ Reject Document
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <div className="text-2xl mb-2">📄</div>
              <div>Select a document to view details</div>
            </div>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}