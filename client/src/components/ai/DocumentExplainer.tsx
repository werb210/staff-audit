/**
 * Document Explainer - Feature 7
 * AI-powered document explanation in plain English
 */

import React, { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FileText, Brain, Loader } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface DocumentExplainerProps {
  documentId: string;
  documentName?: string;
  onClose?: () => void;
}

export function DocumentExplainer({
  documentId,
  documentName,
  onClose,
}: DocumentExplainerProps) {
  const [explanation, setExplanation] = useState<string | null>(null);

  const explainMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("/api/ai-extended/explain-document", {
        method: "POST",
        body: JSON.stringify({ documentId }),
      });
      return response;
    },
    onSuccess: (data) => {
      if (data.success) {
        setExplanation(data.explanation);
      }
    },
  });

  const handleExplain = () => {
    explainMutation.mutate();
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-600" />
            AI Document Explanation
            <Badge variant="outline" className="text-xs">
              Feature 7
            </Badge>
          </CardTitle>

          {!explanation && (
            <Button
              onClick={handleExplain}
              disabled={explainMutation.isPending}
              size="sm"
            >
              {explainMutation.isPending ? (
                <>
                  <Loader className="h-4 w-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Brain className="h-4 w-4 mr-2" />
                  Explain Document
                </>
              )}
            </Button>
          )}
        </div>

        {documentName && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <FileText className="h-4 w-4" />
            {documentName}
          </div>
        )}
      </CardHeader>

      <CardContent>
        {!explanation && !explainMutation.isPending && (
          <Alert>
            <AlertDescription>
              Click "Explain Document" to have AI analyze this document and
              provide a plain-English explanation of its contents and importance
              for loan processing.
            </AlertDescription>
          </Alert>
        )}

        {explanation && (
          <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded border">
              <div className="whitespace-pre-wrap text-sm leading-relaxed">
                {explanation}
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>AI explanation generated</span>
              <span>{new Date().toLocaleTimeString()}</span>
            </div>

            {onClose && (
              <Button variant="outline" size="sm" onClick={onClose}>
                Close
              </Button>
            )}
          </div>
        )}

        {explainMutation.error && (
          <Alert variant="destructive">
            <AlertDescription>
              Failed to explain document: {explainMutation.error.message}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
