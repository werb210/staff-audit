import React from "react";
import { AlertCircle, X } from "lucide-react";

interface ErrorBannerProps {
  message: string;
  onDismiss?: () => void;
  className?: string;
}

const ErrorBanner: React.FC<ErrorBannerProps> = ({ 
  message, 
  onDismiss, 
  className = "" 
}) => {
  return (
    <div className={`bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-md flex items-center justify-between ${className}`}>
      <div className="flex items-center gap-2">
        <AlertCircle className="h-4 w-4" />
        <span className="text-sm">{message}</span>
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="text-red-600 hover:text-red-800 transition-colors"
          aria-label="Dismiss error"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
};

export default ErrorBanner;