import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { api } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Upload, FileText, Download, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { lower } from '@/lib/dedupe';

type Document = {
  id: string;
  name: string;
  type: string;
  size: number;
  applicationId?: string;
  status: string;
  uploadedBy: string;
  created_at: string;
  url?: string;
};

export default function DocumentsListPage() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');

  const { data: documents = [], isLoading, error } = useQuery({
    queryKey: ['documents'],
    queryFn: async () => {
      const response = await api('/api/documents');
      return Array.isArray(response?.items) ? response.items : [];
    },
  });

  const filteredDocuments = documents.filter((doc: Document) => {
    const search = lower(searchQuery || '');
    const name = lower(doc.name || '');
    const type = lower(doc.type || '');
    return name.includes(search) || type.includes(search);
  });

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (isLoading) return <div className="p-6">Loading documents...</div>;
  if (error) return <div className="p-6 text-red-600">Failed to load documents</div>;

  return (
    <div className="p-6" data-page="documents-list">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">Documents</h1>
        <Button className="flex items-center gap-2" onClick={() => {
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = '.pdf,.doc,.docx,.txt,.jpg,.png';
          input.onchange = (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (file) {
              toast({title: "File selected", description: `Selected ${file.name} for upload`});
              // TODO: Implement actual upload to /api/documents/upload
            }
          };
          input.click();
        }}>
          <Upload className="w-4 h-4" />
          Upload Document
        </Button>
      </div>

      <div className="mb-4">
        <Input
          placeholder="Search documents..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-md"
        />
      </div>

      <div className="bg-white rounded-lg border overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Document
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Size
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Uploaded By
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredDocuments.map((document: Document) => (
              <tr key={document.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <FileText className="w-5 h-5 text-gray-400 mr-3" />
                    <div className="font-medium text-gray-900">{document.name}</div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {document.type}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {formatFileSize(document.size || 0)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    document.status === 'approved' 
                      ? 'bg-green-100 text-green-800' 
                      : document.status === 'pending'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {document.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {document.uploadedBy}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(document.created_at).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex items-center gap-2">
                    <Button variant="ghost"
                      size="sm"
                      className="text-blue-600 hover:text-blue-800" onClick={() => {
                        if (document.url) {
                          window.location.href = document.url;
                        } else {
                          toast({title: "Document not available", description: "No URL available for this document"});
                        }
                      }}>
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost"
                      size="sm"
                      className="text-green-600 hover:text-green-800" onClick={() => {
                        if (document.url) {
                          const link = window.document.createElement('a');
                          link.href = document.url;
                          link.download = document.name;
                          link.click();
                          toast({title: "Download started", description: `Downloading ${document.name}`});
                        } else {
                          toast({title: "Download failed", description: "No download URL available"});
                        }
                      }}>
                      <Download className="w-4 h-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredDocuments.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            {searchQuery ? 'No documents match your search.' : 'No documents found.'}
          </div>
        )}
      </div>
    </div>
  );
}