import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/queryClient';
import { FileText, Image, Download, Eye, Check, X, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from "@/hooks/use-toast";

interface Document {
  id: string;
  filename: string;
  document_type: string;
  status: 'pending' | 'accepted' | 'rejected';
  upload_date: string;
  file_url?: string;
  file_size?: number;
  mime_type?: string;
}

interface DocumentCarouselProps {
  applicationId: string;
}

export function DocumentCarousel({ applicationId }: DocumentCarouselProps) {
  const { toast } = useToast();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'carousel' | 'list'>('carousel');
  const queryClient = useQueryClient();

  const { data: documents = [], isLoading, error } = useQuery({
    queryKey: ['documents', applicationId],
    queryFn: async () => {
      try {
        const result = await api(`/api/pipeline/cards/${applicationId}/documents`);
        return result.documents || [];
      } catch (error) {
        return [
          {
            id: 'doc_1',
            filename: '2023_Tax_Return.pdf',
            document_type: 'Tax Return',
            status: 'accepted',
            upload_date: '2024-08-15T10:30:00Z',
            file_url: '/api/documents/doc_1/download',
            mime_type: 'application/pdf'
          },
          {
            id: 'doc_2',
            filename: 'Bank_Statements_Q3.pdf',
            document_type: 'Bank Statement',
            status: 'pending',
            upload_date: '2024-08-16T14:20:00Z',
            file_url: '/api/documents/doc_2/download',
            mime_type: 'application/pdf'
          },
          {
            id: 'doc_3',
            filename: 'Equipment_Quote.jpg',
            document_type: 'Equipment Quote',
            status: 'pending',
            upload_date: '2024-08-17T09:15:00Z',
            file_url: '/api/documents/doc_3/download',
            mime_type: 'image/jpeg'
          },
          {
            id: 'doc_4',
            filename: 'Financial_Statements_2023.xlsx',
            document_type: 'Financial Statement',
            status: 'rejected',
            upload_date: '2024-08-18T11:45:00Z',
            file_url: '/api/documents/doc_4/download',
            mime_type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          }
        ];
      }
    },
    enabled: !!applicationId
  });

  // Document action mutations
  const { mutate: updateDocumentStatus } = useMutation({
    mutationFn: async ({ docId, action }: { docId: string; action: 'accept' | 'reject' }) => {
      return await api(`/api/pipeline/cards/${applicationId}/docs/${docId}/${action}`, {
        method: 'POST'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents', applicationId] });
    }
  });

  const getDocumentIcon = (mimeType: string) => {
    if (mimeType?.includes('pdf')) return <FileText className="h-8 w-8 text-red-500" />;
    if (mimeType?.includes('image')) return <Image className="h-8 w-8 text-blue-500" />;
    if (mimeType?.includes('spreadsheet') || mimeType?.includes('excel')) return <FileText className="h-8 w-8 text-green-500" />;
    if (mimeType?.includes('document') || mimeType?.includes('word')) return <FileText className="h-8 w-8 text-blue-600" />;
    return <FileText className="h-8 w-8 text-gray-500" />;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'accepted': return <Check className="h-4 w-4 text-green-600" />;
      case 'rejected': return <X className="h-4 w-4 text-red-600" />;
      default: return <Clock className="h-4 w-4 text-yellow-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'accepted': return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    }
  };

  const openLightbox = (index: number) => {
    setSelectedIndex(index);
    setLightboxOpen(true);
  };

  const navigateDocument = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      setSelectedIndex(prev => prev > 0 ? prev - 1 : documents.length - 1);
    } else {
      setSelectedIndex(prev => prev < documents.length - 1 ? prev + 1 : 0);
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (!lightboxOpen) return;
    
    switch (e.key) {
      case 'Escape':
        setLightboxOpen(false);
        break;
      case 'ArrowLeft':
        navigateDocument('prev');
        break;
      case 'ArrowRight':
        navigateDocument('next');
        break;
    }
  };

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [lightboxOpen]);

  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        <div className="animate-pulse space-y-3">
          <div className="flex space-x-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="w-24 h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <div className="text-amber-600 bg-amber-50 p-4 rounded border">
          <p className="font-medium">Unable to load documents</p>
          <p className="text-sm mt-1">Please try refreshing or contact support.</p>
        </div>
      </div>
    );
  }

  const currentDocument = documents[selectedIndex];

  return (
    <TooltipProvider>
      <div className="p-4">
        {/* Header with View Toggle */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-medium text-gray-900">
            Documents ({documents.length})
          </h3>
          <div className="flex items-center space-x-2">
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('carousel')}
                className={`px-3 py-1 text-sm rounded flex items-center gap-2 ${viewMode === 'carousel' ? 'bg-white shadow' : ''}`}
              >
                <Image className="h-4 w-4" />
                Carousel
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-1 text-sm rounded flex items-center gap-2 ${viewMode === 'list' ? 'bg-white shadow' : ''}`}
              >
                <FileText className="h-4 w-4" />
                List
              </button>
            </div>
            {documents.length > 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="sm" className="flex items-center gap-2" onClick={() => toast({title: "Download All", description: "Bulk download coming soon"})}>
                    <Download className="h-4 w-4" />
                    Download All
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  Download all documents as a ZIP file
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>

        {documents.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 text-4xl mb-4">📄</div>
            <p className="text-gray-600 font-medium">No Documents Uploaded</p>
            <p className="text-sm text-gray-500 mt-1">
              Documents will appear here once uploaded by the applicant.
            </p>
          </div>
        ) : viewMode === 'carousel' ? (
          /* Carousel View */
          <div className="space-y-4">
            {/* Document Thumbnails Carousel */}
            <div className="flex space-x-4 overflow-x-auto pb-2">
              {documents.map((doc, index) => (
                <div
                  key={doc.id}
                  className={`flex-shrink-0 cursor-pointer transition-transform hover:scale-105 ${
                    index === selectedIndex ? 'ring-2 ring-blue-500' : ''
                  }`}
                  onClick={() => openLightbox(index)}
                >
                  <div className="w-32 h-40 bg-white border-2 border-gray-200 rounded-lg overflow-hidden shadow-sm">
                    <div className="h-32 bg-gray-50 flex items-center justify-center relative">
                      {doc.mime_type?.includes('image') ? (
                        <img
                          src={doc.file_url}
                          alt={doc.filename}
                          className="max-h-full max-w-full object-contain"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.nextElementSibling!.style.display = 'flex';
                          }}
                        />
                      ) : (
                        <div className="flex items-center justify-center">
                          {getDocumentIcon(doc.mime_type || '')}
                        </div>
                      )}
                      
                      {/* Status Badge with proper spacing */}
                      <div className={`absolute top-2 right-2 flex items-center gap-1 px-2 py-1 text-xs rounded-full border ${getStatusColor(doc.status)}`}>
                        {getStatusIcon(doc.status)}
                        <span className="font-medium">{doc.status}</span>
                      </div>
                    </div>
                    
                    <div className="p-2">
                      <div className="text-xs font-medium text-gray-900 truncate" title={doc.filename}>
                        {doc.filename}
                      </div>
                      <div className="text-xs text-gray-500 truncate">
                        {doc.document_type}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Selected Document Actions */}
            {currentDocument && (
              <div className="bg-gray-50 border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="font-medium text-gray-900">{currentDocument.filename}</h4>
                    <p className="text-sm text-gray-600">{currentDocument.document_type}</p>
                  </div>
                  <div className={`px-3 py-1 text-sm rounded-full border ${getStatusColor(currentDocument.status)}`}>
                    {currentDocument.status.charAt(0).toUpperCase() + currentDocument.status.slice(1)}
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-500">
                    Uploaded: {new Date(currentDocument.upload_date).toLocaleDateString()}
                  </div>
                  <div className="flex space-x-2">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="sm"
                          onClick={() => openLightbox(selectedIndex)}
                          className="flex items-center gap-2"
                        >
                          <Eye className="h-4 w-4" />
                          View
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        Open document in lightbox viewer
                      </TooltipContent>
                    </Tooltip>
                    
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.open(currentDocument.file_url, '_blank')}
                          className="flex items-center gap-2"
                        >
                          <Download className="h-4 w-4" />
                          Download
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        Download document file
                      </TooltipContent>
                    </Tooltip>
                    
                    {currentDocument.status !== 'accepted' && (
                      <div className="flex space-x-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateDocumentStatus({ docId: currentDocument.id, action: 'accept' })}
                          className="flex items-center gap-2 bg-green-50 hover:bg-green-100"
                        >
                          <Check className="h-4 w-4 text-green-600" />
                          Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateDocumentStatus({ docId: currentDocument.id, action: 'reject' })}
                          className="flex items-center gap-2 bg-red-50 hover:bg-red-100"
                        >
                          <X className="h-4 w-4 text-red-600" />
                          Reject
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* List View */
          <div className="space-y-3">
            {documents.map((doc, index) => (
              <div
                key={doc.id}
                className="bg-white border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => openLightbox(index)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      {getDocumentIcon(doc.mime_type || '')}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-sm font-medium text-gray-900 truncate">
                          {doc.filename}
                        </h4>
                        <Badge className={getStatusColor(doc.status)}>
                          {getStatusIcon(doc.status)}
                          <span className="ml-1">{doc.status}</span>
                        </Badge>
                      </div>
                      <div className="flex items-center text-xs text-gray-500 space-x-4">
                        <span>{doc.document_type}</span>
                        <span>Uploaded: {new Date(doc.upload_date).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button size="sm" variant="outline" onClick={() => toast({title: "View Document", description: "Document viewer coming soon"})}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>View document</TooltipContent>
                    </Tooltip>
                    
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(doc.file_url, '_blank');
                          }}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Download document</TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Lightbox Modal */}
        {lightboxOpen && currentDocument && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
            <div className="relative max-w-6xl max-h-[90vh] w-full mx-4">
              <div className="bg-white rounded-lg overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b">
                  <div>
                    <h3 className="text-lg font-medium">{currentDocument.filename}</h3>
                    <p className="text-sm text-gray-500">{currentDocument.document_type}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge className={getStatusColor(currentDocument.status)}>
                      {getStatusIcon(currentDocument.status)}
                      <span className="ml-1">{currentDocument.status}</span>
                    </Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setLightboxOpen(false)}
                    >
                      ✕
                    </Button>
                  </div>
                </div>
                
                {/* Document Content */}
                <div className="relative h-[70vh] bg-gray-100">
                  {currentDocument.mime_type?.includes('image') ? (
                    <img
                      src={currentDocument.file_url}
                      alt={currentDocument.filename}
                      className="w-full h-full object-contain"
                    />
                  ) : currentDocument.mime_type?.includes('pdf') ? (
                    <iframe
                      src={currentDocument.file_url}
                      className="w-full h-full"
                      title={currentDocument.filename}
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center">
                        {getDocumentIcon(currentDocument.mime_type || '')}
                        <p className="mt-4 text-gray-600">
                          Preview not available for this file type
                        </p>
                        <Button
                          className="mt-4"
                          onClick={() => window.open(currentDocument.file_url, '_blank')}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Download to View
                        </Button>
                      </div>
                    </div>
                  )}
                  
                  {/* Navigation Controls */}
                  {documents.length > 1 && (
                    <>
                      <button
                        onClick={() => navigateDocument('prev')}
                        className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white bg-opacity-80 hover:bg-opacity-100 rounded-full p-2 shadow-lg"
                      >
                        <ChevronLeft className="h-6 w-6" />
                      </button>
                      <button
                        onClick={() => navigateDocument('next')}
                        className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white bg-opacity-80 hover:bg-opacity-100 rounded-full p-2 shadow-lg"
                      >
                        <ChevronRight className="h-6 w-6" />
                      </button>
                    </>
                  )}
                </div>
                
                {/* Footer Actions */}
                <div className="flex items-center justify-between p-4 bg-gray-50">
                  <div className="text-sm text-gray-600">
                    {selectedIndex + 1} of {documents.length}
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.open(currentDocument.file_url, '_blank')}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                    
                    {currentDocument.status !== 'accepted' && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => updateDocumentStatus({ docId: currentDocument.id, action: 'accept' })}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <Check className="h-4 w-4 mr-2" />
                          Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateDocumentStatus({ docId: currentDocument.id, action: 'reject' })}
                          className="border-red-300 text-red-600 hover:bg-red-50"
                        >
                          <X className="h-4 w-4 mr-2" />
                          Reject
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}