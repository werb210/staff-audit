/**
 * Lender Email Drafter - Feature 8
 * AI-powered email drafting for lender submissions
 */

import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Mail, Wand2, Loader, Copy, Send } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface LenderEmailDrafterProps {
  applicationId: string;
  businessName?: string;
  onEmailReady?: (email: string) => void;
}

export function LenderEmailDrafter({ applicationId, businessName, onEmailReady }: LenderEmailDrafterProps) {
  const [selectedLender, setSelectedLender] = useState('');
  const [emailDraft, setEmailDraft] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  const draftMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('/api/ai-extended/draft-lender-email', {
        method: 'POST',
        body: JSON.stringify({ 
          applicationId, 
          lenderName: selectedLender || 'the lender'
        })
      });
      return response;
    },
    onSuccess: (data) => {
      if (data.success) {
        setEmailDraft(data.emailDraft);
        setIsEditing(true);
      }
    }
  });

  const handleDraftEmail = () => {
    draftMutation.mutate();
  };

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(emailDraft);
  };

  const handleSendEmail = () => {
    if (onEmailReady) {
      onEmailReady(emailDraft);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5 text-blue-600" />
          AI Email Drafter
          <Badge variant="outline" className="text-xs">Feature 8</Badge>
        </CardTitle>
        
        {businessName && (
          <div className="text-sm text-gray-600">
            Drafting submission email for: {businessName}
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Lender Selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Target Lender (Optional)</label>
          <Select value={selectedLender} onValueChange={setSelectedLender}>
            <SelectTrigger>
              <SelectValue placeholder="Select lender for personalized email" />
            </SelectTrigger>
            <SelectContent className="bg-white border border-gray-200 shadow-lg">
              <SelectItem value="Wells Fargo Business" className="text-gray-900 hover:bg-gray-100">Wells Fargo Business</SelectItem>
              <SelectItem value="Chase Business Banking" className="text-gray-900 hover:bg-gray-100">Chase Business Banking</SelectItem>
              <SelectItem value="Bank of America" className="text-gray-900 hover:bg-gray-100">Bank of America</SelectItem>
              <SelectItem value="PNC Bank" className="text-gray-900 hover:bg-gray-100">PNC Bank</SelectItem>
              <SelectItem value="Regions Bank" className="text-gray-900 hover:bg-gray-100">Regions Bank</SelectItem>
              <SelectItem value="TD Bank" className="text-gray-900 hover:bg-gray-100">TD Bank</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Draft Email Button */}
        {!emailDraft && (
          <Button 
            onClick={handleDraftEmail}
            disabled={draftMutation.isPending}
            className="w-full"
          >
            {draftMutation.isPending ? (
              <>
                <Loader className="h-4 w-4 mr-2 animate-spin" />
                Drafting Email...
              </>
            ) : (
              <>
                <Wand2 className="h-4 w-4 mr-2" />
                Draft AI Email
              </>
            )}
          </Button>
        )}

        {/* Email Draft Display/Editor */}
        {emailDraft && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">AI-Generated Email</label>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handleCopyEmail}>
                  <Copy className="h-3 w-3 mr-1" />
                  Copy
                </Button>
                {onEmailReady && (
                  <Button size="sm" onClick={handleSendEmail}>
                    <Send className="h-3 w-3 mr-1" />
                    Use Email
                  </Button>
                )}
              </div>
            </div>
            
            <Textarea
              value={emailDraft}
              onChange={(e) => setEmailDraft(e.target.value)}
              className="min-h-[300px] font-mono text-sm"
              placeholder="AI-generated email will appear here..."
            />
            
            <div className="text-xs text-gray-500">
              {emailDraft.split(' ').length} words • 
              {emailDraft.length} characters •
              AI-generated and editable
            </div>
          </div>
        )}

        {/* Initial Instructions */}
        {!emailDraft && !draftMutation.isPending && (
          <Alert>
            <AlertDescription>
              The AI will draft a professional lender submission email based on the application data, 
              highlighting key financial strengths and business information. You can select a specific 
              lender for personalized messaging.
            </AlertDescription>
          </Alert>
        )}

        {/* Error Display */}
        {draftMutation.error && (
          <Alert variant="destructive">
            <AlertDescription>
              Failed to draft email: {draftMutation.error.message}
            </AlertDescription>
          </Alert>
        )}

        {/* Email Tips */}
        {emailDraft && (
          <Alert>
            <AlertDescription>
              <strong>Email Tips:</strong> Review the AI-generated content for accuracy. 
              Personalize the greeting and closing. Ensure all application highlights are correct 
              before sending to the lender.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}