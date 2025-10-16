import { QueryClientProvider } from "@tanstack/react-query";
import { ReactNode, Component, ErrorInfo } from "react";
import { queryClient } from "@/lib/queryClient";
// 🔒 CANONICAL ROUTER - Main app uses wouter, lender-portal uses react-router-dom
// ⚠️  NEVER mix router imports - causes useNavigate() context crashes
import { Router } from "wouter";

// 🚨 Error Boundary to catch React component render errors
interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class AppErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("🚨 [REACT] Error Boundary caught error:", error);
    console.error("🚨 [REACT] Error info:", errorInfo);
    console.error("🚨 [REACT] Component stack:", errorInfo.componentStack);
  }

  render() {
    if (this.state.hasError) {
      const error = this.state.error;
      
      return (
        <div style={{ 
          padding: '20px', 
          color: 'red', 
          fontFamily: 'monospace', 
          border: '2px solid red', 
          background: '#ffe6e6',
          margin: '20px'
        }}>
          <h2>🚨 React Component Error</h2>
          <p><strong>Error:</strong> {error?.message || 'Unknown error'}</p>
          <p>A React component failed to render. Check the browser console for details.</p>
          <details>
            <summary>Error Stack</summary>
            <pre style={{ background: '#f5f5f5', padding: '10px', overflow: 'auto' }}>
              {error?.stack || 'No stack trace available'}
            </pre>
          </details>
          <button 
            onClick={() => this.setState({ hasError: false, error: undefined })} 
            style={{ padding: '8px 16px', marginTop: '10px' }}
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
    </QueryClientProvider>
  );
}