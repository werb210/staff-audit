/**
 * 🔄 PHASE 4: DOCUMENT RECOVERY DASHBOARD
 * Staff UI component for recovering missing documents with red flag indicators
 */

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertTriangle, Upload, CheckCircle, XCircle, Clock, FileX } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface DocumentWithStatus {
  id: string;
  fileName: string;
  fileSize: number;
  documentType: string;
  createdAt: string;
  physicalFileExists: boolean;
  needsRecovery: boolean;
  isPlaceholder: boolean;
}

interface ApplicationDocuments {
  applicationId: string;
  businessName: string;
  documents: DocumentWithStatus[];
  totalDocuments: number;
  missingFiles: number;
  healthyFiles: number;
}

export function DocumentRecoveryDashboard({ applicationId }: { applicationId: string }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedDocument, setSelectedDocument] = useState<DocumentWithStatus | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [recoveryDialogOpen, setRecoveryDialogOpen] = useState(false);

  // Fetch document status for application
  const { data: appDocs, isLoading, error } = useQuery<ApplicationDocuments>({
    queryKey: ['document-recovery', applicationId],
    queryFn: async () => {
      const response = await fetch(`/api/document-recovery/application/${applicationId}/documents`);
      if (!response.ok) throw new Error('Failed to fetch document status');
      return response.json();
    },
    refetchInterval: 10000 // Refresh every 10 seconds
  });

  // Document replacement mutation
  const replacementMutation = useMutation({
    mutationFn: async ({ documentId, file }: { documentId: string; file: File }) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('uploadedBy', 'staff-recovery');

      const response = await fetch(`/api/document-recovery/document/${documentId}/replace`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Replacement failed');
      }

      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Document Replaced Successfully",
        description: `${data.originalFileName} has been restored with validation passed: ${data.validationPassed}`,
      });
      
      // Refresh the document status
      queryClient.invalidateQueries({ queryKey: ['document-recovery', applicationId] });
      
      // Close dialog and reset state
      setRecoveryDialogOpen(false);
      setSelectedDocument(null);
      setUploadFile(null);
    },
    onError: (error: any) => {
      toast({
        title: "Document Replacement Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setUploadFile(file);
    }
  };

  const handleReplacement = () => {
    if (selectedDocument && uploadFile) {
      replacementMutation.mutate({
        documentId: selectedDocument.id,
        file: uploadFile
      });
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <Clock className="animate-spin h-6 w-6 mr-2" />
          <span>Loading document status...</span>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <XCircle className="h-6 w-6 mr-2 text-red-500" />
          <span>Failed to load document status</span>
        </CardContent>
      </Card>
    );
  }

  if (!appDocs) {
    return null;
  }

  const criticalIssues = appDocs.missingFiles;
  const hasCriticalIssues = criticalIssues > 0;

  return (
    <div className="space-y-6">
      {/* Header with Critical Alert */}
      <Card className={hasCriticalIssues ? "border-red-500 bg-red-50 dark:bg-red-950" : "border-green-500 bg-green-50 dark:bg-green-950"}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {hasCriticalIssues ? (
                <AlertTriangle className="h-6 w-6 text-red-600" />
              ) : (
                <CheckCircle className="h-6 w-6 text-green-600" />
              )}
              <div>
                <CardTitle className={hasCriticalIssues ? "text-red-900 dark:text-red-100" : "text-green-900 dark:text-green-100"}>
                  Document Recovery Dashboard
                </CardTitle>
                <CardDescription className="text-sm">
                  {appDocs.businessName} • Application: {applicationId.slice(0, 8)}...
                </CardDescription>
              </div>
            </div>
            
            <div className="flex space-x-2">
              <Badge variant={hasCriticalIssues ? "destructive" : "default"}>
                {criticalIssues} Missing
              </Badge>
              <Badge variant="secondary">
                {appDocs.healthyFiles} Healthy
              </Badge>
            </div>
          </div>
        </CardHeader>

        {hasCriticalIssues && (
          <CardContent>
            <div className="bg-red-100 dark:bg-red-900 p-4 rounded-lg border border-red-200 dark:border-red-800">
              <p className="text-red-800 dark:text-red-200 font-medium">
                🚨 DATA LOSS DETECTED: {criticalIssues} document(s) are missing from disk storage
              </p>
              <p className="text-red-700 dark:text-red-300 text-sm mt-1">
                These documents were uploaded but the physical files are no longer accessible. Use the recovery options below to restore them.
              </p>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Document List */}
      <div className="grid gap-4">
        {appDocs.documents.map((doc) => (
          <Card 
            key={doc.id}
            className={doc.needsRecovery ? "border-red-300 bg-red-50 dark:bg-red-950" : ""}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {doc.needsRecovery ? (
                    <FileX className="h-5 w-5 text-red-500" />
                  ) : (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  )}
                  
                  <div>
                    <h3 className="font-medium">{doc.fileName}</h3>
                    <p className="text-sm text-muted-foreground">
                      {doc.documentType} • {doc.fileSize} bytes • {new Date(doc.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {doc.needsRecovery && (
                    <Badge variant="destructive" className="flex items-center space-x-1">
                      <AlertTriangle className="h-3 w-3" />
                      <span>⚠️ Missing File</span>
                    </Badge>
                  )}
                  
                  {doc.isPlaceholder && (
                    <Badge variant="outline">Placeholder</Badge>
                  )}
                  
                  {doc.needsRecovery && (
                    <Dialog open={recoveryDialogOpen && selectedDocument?.id === doc.id} onOpenChange={setRecoveryDialogOpen}>
                      <DialogTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="bg-yellow-100 hover:bg-yellow-200 border-yellow-300"
                          onClick={() => setSelectedDocument(doc)}
                        >
                          <Upload className="h-4 w-4 mr-1" />
                          Re-upload
                        </Button>
                      </DialogTrigger>
                      
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Restore Missing Document</DialogTitle>
                        </DialogHeader>
                        
                        <div className="space-y-4">
                          <div className="bg-yellow-50 dark:bg-yellow-950 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800">
                            <p className="text-yellow-800 dark:text-yellow-200 text-sm">
                              <strong>Original:</strong> {doc.fileName}<br/>
                              <strong>Type:</strong> {doc.documentType}<br/>
                              <strong>Size:</strong> {doc.fileSize} bytes
                            </p>
                          </div>
                          
                          <div>
                            <Label htmlFor="replacement-file">Select Replacement File</Label>
                            <Input
                              id="replacement-file"
                              type="file"
                              accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                              onChange={handleFileUpload}
                              className="mt-1"
                            />
                          </div>
                          
                          {uploadFile && (
                            <div className="text-sm text-muted-foreground">
                              Selected: {uploadFile.name} ({uploadFile.size} bytes)
                            </div>
                          )}
                          
                          <div className="flex space-x-2">
                            <Button
                              onClick={handleReplacement}
                              disabled={!uploadFile || replacementMutation.isPending}
                              className="flex-1"
                            >
                              {replacementMutation.isPending ? 'Replacing...' : 'Replace Document'}
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => {
                                setRecoveryDialogOpen(false);
                                setSelectedDocument(null);
                                setUploadFile(null);
                              }}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {appDocs.documents.length === 0 && (
        <Card>
          <CardContent className="flex items-center justify-center p-8">
            <p className="text-muted-foreground">No documents found for this application</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}