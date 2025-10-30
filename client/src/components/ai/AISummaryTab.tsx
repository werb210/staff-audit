/**
 * AI Summary Tab - Feature 1
 * Advanced AI credit summary with editing and lender customization
 */

import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Brain,
  Save,
  FileText,
  Lock,
  Edit,
  Download,
  Loader,
  Wand2,
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface AISummaryTabProps {
  applicationId: string;
}

export function AISummaryTab({ applicationId }: AISummaryTabProps) {
  const [summary, setSummary] = useState("");
  const [editing, setEditing] = useState(false);
  const [selectedLender, setSelectedLender] = useState("");
  const [hasChanges, setHasChanges] = useState(false);
  const [showTemplateOverride, setShowTemplateOverride] = useState(false);
  const [customTemplate, setCustomTemplate] = useState("");
  const queryClient = useQueryClient();

  // Generate AI summary mutation
  const generateSummaryMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("/api/ai/generate-summary", {
        method: "POST",
        body: JSON.stringify({ applicationId }),
      });
      return response;
    },
    onSuccess: (data) => {
      if (data.success) {
        setSummary(data.summary || "");
        setEditing(true);
        setHasChanges(false);
      }
    },
  });

  // Submit summary mutation
  const submitSummaryMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("/api/ai/submit-summary", {
        method: "POST",
        body: JSON.stringify({
          applicationId,
          summary,
          lenderId: selectedLender || undefined,
        }),
      });
      return response;
    },
    onSuccess: () => {
      setEditing(false);
      setHasChanges(false);
      queryClient.invalidateQueries({
        queryKey: ["application", applicationId],
      });
    },
  });

  const handleSummaryChange = (value: string) => {
    setSummary(value);
    setHasChanges(true);
  };

  const handleSave = () => {
    submitSummaryMutation.mutate();
  };

  const handleGenerate = () => {
    generateSummaryMutation.mutate();
  };

  const handleEdit = () => {
    setEditing(true);
  };

  return (
    <div className="space-y-6">
      {/* Header with Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-semibold">AI Credit Summary</h3>
          <Badge variant="outline" className="text-blue-600">
            Feature 1
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          {!summary && (
            <Button
              onClick={handleGenerate}
              disabled={generateSummaryMutation.isPending}
            >
              {generateSummaryMutation.isPending ? (
                <>
                  <Loader className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Wand2 className="h-4 w-4 mr-2" />
                  Generate Summary
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Lender Customization */}
      {summary && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">
              Lender-Specific Customizations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Select value={selectedLender} onValueChange={setSelectedLender}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Select lender (optional)" />
                </SelectTrigger>
                <SelectContent className="bg-white border border-gray-200 shadow-lg">
                  <SelectItem
                    value="wells-fargo"
                    className="text-gray-900 hover:bg-gray-100"
                  >
                    Wells Fargo
                  </SelectItem>
                  <SelectItem
                    value="chase"
                    className="text-gray-900 hover:bg-gray-100"
                  >
                    Chase Business
                  </SelectItem>
                  <SelectItem
                    value="bofa"
                    className="text-gray-900 hover:bg-gray-100"
                  >
                    Bank of America
                  </SelectItem>
                  <SelectItem
                    value="pnc"
                    className="text-gray-900 hover:bg-gray-100"
                  >
                    PNC Bank
                  </SelectItem>
                  <SelectItem
                    value="regions"
                    className="text-gray-900 hover:bg-gray-100"
                  >
                    Regions Bank
                  </SelectItem>
                </SelectContent>
              </Select>

              {selectedLender && (
                <Badge variant="secondary">
                  Customized for {selectedLender}
                </Badge>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowTemplateOverride(!showTemplateOverride)}
              >
                <Wand2 className="h-4 w-4 mr-2" />
                Template Override
              </Button>
            </div>

            {/* Template Override Panel */}
            {showTemplateOverride && (
              <div className="mt-4 border border-dashed border-gray-300 rounded-lg p-4 bg-yellow-50">
                <div className="flex items-center gap-2 mb-3">
                  <Wand2 className="h-4 w-4 text-yellow-600" />
                  <h4 className="font-medium text-yellow-800">
                    Custom Template Override
                  </h4>
                </div>
                <p className="text-sm text-yellow-700 mb-3">
                  Override the default AI template with custom instructions. Use
                  variables like {"{company_name}"}, {"{loan_amount}"},{" "}
                  {"{industry}"} for dynamic content.
                </p>
                <Textarea
                  value={customTemplate}
                  onChange={(e) => setCustomTemplate(e.target.value)}
                  placeholder="Enter custom template instructions here... 
Example: Generate a credit summary for {company_name} focusing on {industry} business model and {loan_amount} funding request. Include risk assessment and recommendation."
                  className="min-h-[120px] text-sm font-mono"
                />
                <div className="flex items-center justify-between mt-3">
                  <div className="text-xs text-gray-600">
                    Available variables: company_name, loan_amount, industry,
                    revenue, credit_score
                  </div>
                  <Button
                    size="sm"
                    onClick={() => {
                      // Apply template logic here
                      setShowTemplateOverride(false);
                    }}
                    disabled={!customTemplate.trim()}
                  >
                    Apply Template
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Summary Content */}
      {summary ? (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Generated Credit Summary</CardTitle>
              <div className="flex items-center gap-2">
                {hasChanges && (
                  <Badge variant="outline" className="text-orange-600">
                    Unsaved changes
                  </Badge>
                )}

                {editing ? (
                  <Button
                    onClick={handleSave}
                    disabled={submitSummaryMutation.isPending}
                  >
                    {submitSummaryMutation.isPending ? (
                      <Loader className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    Save & Generate PDF
                  </Button>
                ) : (
                  <Button variant="outline" onClick={handleEdit}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Summary
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {editing ? (
              <Textarea
                value={summary}
                onChange={(e) => handleSummaryChange(e.target.value)}
                className="min-h-[500px] font-mono text-sm"
                placeholder="AI-generated credit summary will appear here..."
              />
            ) : (
              <div className="whitespace-pre-wrap bg-gray-50 p-4 rounded border min-h-[500px] font-mono text-sm">
                {summary}
              </div>
            )}
          </CardContent>
          <CardFooter className="text-sm text-gray-600">
            {summary.split(" ").length} words • {summary.length} characters
          </CardFooter>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-8 text-center">
            <Brain className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h4 className="text-lg font-medium mb-2">
              AI Credit Summary Generator
            </h4>
            <p className="text-gray-600 mb-6">
              Generate a comprehensive credit analysis using AI that analyzes
              application data, documents, and business information to create a
              professional summary.
            </p>

            <Alert className="mb-6">
              <AlertDescription>
                The AI will analyze: Application form data • Uploaded documents
                • OCR insights • Banking information • Business details
              </AlertDescription>
            </Alert>

            <Button
              onClick={handleGenerate}
              disabled={generateSummaryMutation.isPending}
              size="lg"
            >
              {generateSummaryMutation.isPending ? (
                <>
                  <Loader className="h-4 w-4 mr-2 animate-spin" />
                  Generating Summary...
                </>
              ) : (
                <>
                  <Brain className="h-4 w-4 mr-2" />
                  Generate AI Summary
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Error Display */}
      {(generateSummaryMutation.error || submitSummaryMutation.error) && (
        <Alert variant="destructive">
          <AlertDescription>
            {generateSummaryMutation.error?.message ||
              submitSummaryMutation.error?.message}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
