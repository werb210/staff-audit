import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useMutation } from "@tanstack/react-query";
import { Loader2, Sparkles, Copy, Check, RefreshCw } from "lucide-react";

interface SmartReplyPanelProps {
  threadHistory?: string;
  onReplySelect?: (reply: string) => void;
  contactName?: string;
  applicationId?: string;
}

interface ReplyOption {
  id: number;
  text: string;
  tone: string;
  characterCount: number;
}

export default function SmartReplyPanel({
  threadHistory = "",
  onReplySelect,
  contactName,
  applicationId,
}: SmartReplyPanelProps) {
  const [replyType, setReplyType] = useState<"sms" | "email" | "professional">(
    "professional",
  );
  const [tone, setTone] = useState<"professional" | "friendly" | "formal">(
    "professional",
  );
  const [customHistory, setCustomHistory] = useState(threadHistory);
  const [selectedReply, setSelectedReply] = useState<string>("");
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  // Generate single smart reply
  const smartReplyMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/ai/smart-reply", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          threadHistory: customHistory,
          replyType,
          tone,
          context: {
            contactName,
            applicationId,
          },
        }),
      });
      if (!response.ok) {
        throw new Error("Failed to generate smart reply");
      }
      return response.json();
    },
  });

  // Generate multiple reply options
  const replyOptionsMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/ai/reply-options", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          threadHistory: customHistory,
          replyType,
          context: {
            contactName,
            applicationId,
          },
        }),
      });
      if (!response.ok) {
        throw new Error("Failed to generate reply options");
      }
      return response.json();
    },
  });

  // Generate follow-up suggestions
  const followupMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/ai/followup-suggestions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          threadHistory: customHistory,
          context: {
            contactName,
            applicationId,
          },
        }),
      });
      if (!response.ok) {
        throw new Error("Failed to generate followup suggestions");
      }
      return response.json();
    },
  });

  const handleCopyReply = async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (error) {
      console.error("Failed to copy text:", error);
    }
  };

  const handleSelectReply = (text: string) => {
    setSelectedReply(text);
    if (onReplySelect) {
      onReplySelect(text);
    }
  };

  const singleReply = smartReplyMutation.data?.reply;
  const replyOptions: ReplyOption[] = replyOptionsMutation.data?.options || [];
  const followupSuggestions: string[] =
    followupMutation.data?.suggestions || [];

  return (
    <div className="space-y-6">
      {/* Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Sparkles className="h-5 w-5 text-purple-500" />
            <span>AI Smart Reply</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Context Information */}
          {(contactName || applicationId) && (
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <span>Context:</span>
              {contactName && (
                <Badge variant="outline">Contact: {contactName}</Badge>
              )}
              {applicationId && (
                <Badge variant="outline">
                  App: {applicationId.slice(0, 8)}
                </Badge>
              )}
            </div>
          )}

          {/* Reply Type Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Reply Type</label>
              <Select
                value={replyType}
                onValueChange={(value: any) => setReplyType(value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sms">SMS (160 chars)</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="professional">Professional</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Tone</label>
              <Select
                value={tone}
                onValueChange={(value: any) => setTone(value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="professional">Professional</SelectItem>
                  <SelectItem value="friendly">Friendly</SelectItem>
                  <SelectItem value="formal">Formal</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Thread History Input */}
          <div>
            <label className="text-sm font-medium">Conversation History</label>
            <Textarea
              placeholder="Paste the conversation thread here..."
              value={customHistory}
              onChange={(e) => setCustomHistory(e.target.value)}
              rows={4}
              className="mt-1"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-2">
            <Button
              onClick={() => smartReplyMutation.mutate()}
              disabled={!customHistory.trim() || smartReplyMutation.isPending}
            >
              {smartReplyMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Sparkles className="h-4 w-4 mr-2" />
              )}
              Generate Reply
            </Button>

            <Button
              variant="outline"
              onClick={() => replyOptionsMutation.mutate()}
              disabled={!customHistory.trim() || replyOptionsMutation.isPending}
            >
              {replyOptionsMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Get Options
            </Button>

            <Button
              variant="outline"
              onClick={() => followupMutation.mutate()}
              disabled={!customHistory.trim() || followupMutation.isPending}
            >
              Follow-up Ideas
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Single Reply Result */}
      {singleReply && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Generated Reply</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm">{singleReply}</p>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <Badge variant="outline">
                    {smartReplyMutation.data?.metadata?.replyType}
                  </Badge>
                  <Badge variant="outline">
                    {smartReplyMutation.data?.metadata?.tone}
                  </Badge>
                  <span>
                    {smartReplyMutation.data?.metadata?.characterCount} chars
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleCopyReply(singleReply, 0)}
                  >
                    {copiedIndex === 0 ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleSelectReply(singleReply)}
                  >
                    Use This Reply
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Multiple Reply Options */}
      {replyOptions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Reply Options</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {replyOptions.map((option, index) => (
              <div key={option.id} className="p-3 border rounded-lg">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="text-xs">
                      {option.tone} • {option.characterCount} chars
                    </Badge>
                  </div>
                  <p className="text-sm">{option.text}</p>
                  <div className="flex items-center justify-end space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleCopyReply(option.text, option.id)}
                    >
                      {copiedIndex === option.id ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleSelectReply(option.text)}
                    >
                      Use This
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Follow-up Suggestions */}
      {followupSuggestions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Follow-up Suggestions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {followupSuggestions.map((suggestion, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2 bg-muted/50 rounded"
                >
                  <span className="text-sm">{suggestion}</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleCopyReply(suggestion, 100 + index)}
                  >
                    {copiedIndex === 100 + index ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Selected Reply Display */}
      {selectedReply && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="text-lg text-green-800">
              Selected Reply
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-green-700">{selectedReply}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
