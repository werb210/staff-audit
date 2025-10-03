import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Loader2, AlertTriangle, CheckCircle, Copy, ExternalLink, RefreshCw, X } from "lucide-react";

interface Citation {
  source: string;
  page?: number;
  confidence?: number;
}

interface AIResultData {
  ok: boolean;
  result?: any;
  error?: string;
  code?: string;
  message?: string;
  hint?: string;
  citations?: Citation[];
  jobId?: string;
  requestId?: string;
  metadata?: {
    model?: string;
    tokens?: number;
    latency?: number;
    cached?: boolean;
  };
}

interface AIResultPanelProps {
  title: string;
  data: AIResultData | null;
  loading: boolean;
  error: string | null;
  onRetry?: () => void;
  onCancel?: () => void;
  onClose?: () => void;
  className?: string;
}

export default function AIResultPanel({
  title,
  data,
  loading,
  error,
  onRetry,
  onCancel,
  onClose,
  className = "",
}: AIResultPanelProps) {
  const [showRaw, setShowRaw] = React.useState(false);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const openLogs = () => {
    if (data?.requestId) {
      window.open(`/staff/admin/ai/logs?requestId=${data.requestId}`, '_blank');
    }
  };

  const renderCitations = (citations: Citation[]) => {
    if (!citations?.length) return null;
    
    return (
      <div className="mt-3 p-2 bg-blue-50 rounded-lg">
        <div className="text-sm font-medium text-blue-900 mb-2">Sources:</div>
        <div className="space-y-1">
          {citations.map((citation, idx) => (
            <div key={idx} className="text-xs text-blue-700 flex items-center gap-2">
              <ExternalLink className="w-3 h-3" />
              {citation.source}
              {citation.page && <span>• Page {citation.page}</span>}
              {citation.confidence && (
                <Badge variant="outline" className="text-xs">
                  {Math.round(citation.confidence * 100)}% confidence
                </Badge>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderMetadata = (metadata: AIResultData['metadata']) => {
    if (!metadata) return null;
    
    return (
      <div className="text-xs text-gray-500 mt-2 flex items-center gap-3">
        {metadata.model && <span>Model: {metadata.model}</span>}
        {metadata.tokens && <span>Tokens: {metadata.tokens}</span>}
        {metadata.latency && <span>Latency: {metadata.latency}ms</span>}
        {metadata.cached && <Badge variant="secondary" className="text-xs">Cached</Badge>}
      </div>
    );
  };

  const renderResult = () => {
    if (!data) return null;

    if (data.error) {
      return (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="w-4 h-4" />
            <span className="font-medium">Error: {data.code || 'Unknown'}</span>
          </div>
          <div className="text-sm text-red-700">{data.message || data.error}</div>
          {data.hint && (
            <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
              💡 {data.hint}
            </div>
          )}
          <div className="flex gap-2">
            {onRetry && (
              <Button size="sm" variant="outline" onClick={onRetry}>
                <RefreshCw className="w-3 h-3 mr-1" />
                Retry
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={() => copyToClipboard(data.error || '')}>
              <Copy className="w-3 h-3 mr-1" />
              Copy Error
            </Button>
            {data.requestId && (
              <Button size="sm" variant="outline" onClick={openLogs}>
                <ExternalLink className="w-3 h-3 mr-1" />
                View Logs
              </Button>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-green-600">
          <CheckCircle className="w-4 h-4" />
          <span className="font-medium">Success</span>
        </div>
        
        {/* Main result content */}
        <div className="space-y-2">
          {typeof data.result === 'string' ? (
            <div className="text-sm">{data.result}</div>
          ) : data.result ? (
            <div className="text-sm">
              {/* Format common result types */}
              {data.result.score !== undefined && (
                <div>Score: <span className="font-mono">{data.result.score}</span></div>
              )}
              {data.result.probability !== undefined && (
                <div>Probability: <span className="font-mono">{Math.round(data.result.probability * 100)}%</span></div>
              )}
              {data.result.summary && (
                <div className="mt-2">{data.result.summary}</div>
              )}
              {data.result.recommendations && Array.isArray(data.result.recommendations) && (
                <div className="mt-2">
                  <div className="font-medium">Recommendations:</div>
                  <ul className="list-disc list-inside text-sm mt-1">
                    {data.result.recommendations.map((rec: string, idx: number) => (
                      <li key={idx}>{rec}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : null}
        </div>

        {/* Citations */}
        {renderCitations(data.citations || [])}

        {/* Metadata */}
        {renderMetadata(data.metadata)}

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowRaw(!showRaw)}
          >
            {showRaw ? 'Hide' : 'Show'} Raw Data
          </Button>
          {data.result && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => copyToClipboard(JSON.stringify(data.result, null, 2))}
            >
              <Copy className="w-3 h-3 mr-1" />
              Copy Result
            </Button>
          )}
        </div>

        {/* Raw data view */}
        {showRaw && (
          <pre className="text-xs bg-gray-50 p-3 rounded overflow-auto max-h-64 border">
            {JSON.stringify(data, null, 2)}
          </pre>
        )}
      </div>
    );
  };

  return (
    <Card 
      data-testid="ai-result-panel" 
      className={`p-4 border-l-4 border-l-blue-500 ${className}`}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-900">{title}</h3>
        <div className="flex items-center gap-2">
          {loading && onCancel && (
            <Button size="sm" variant="outline" onClick={onCancel}>
              <X className="w-3 h-3 mr-1" />
              Cancel
            </Button>
          )}
          {onClose && (
            <Button size="sm" variant="ghost" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-blue-600">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Running AI analysis...</span>
        </div>
      )}

      {error && !data && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="w-4 h-4" />
            <span className="font-medium">Request Failed</span>
          </div>
          <div className="text-sm text-red-700">{error}</div>
          <div className="flex gap-2">
            {onRetry && (
              <Button size="sm" variant="outline" onClick={onRetry}>
                <RefreshCw className="w-3 h-3 mr-1" />
                Retry
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={() => copyToClipboard(error)}>
              <Copy className="w-3 h-3 mr-1" />
              Copy Error
            </Button>
          </div>
        </div>
      )}

      {!loading && !error && data && renderResult()}

      {!loading && !error && !data && (
        <div className="text-gray-500 text-sm">No data available</div>
      )}
    </Card>
  );
}