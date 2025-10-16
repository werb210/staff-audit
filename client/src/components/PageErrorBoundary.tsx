import React from 'react';

interface PageErrorBoundaryState {
  error?: Error;
}

interface PageErrorBoundaryProps {
  children: React.ReactNode;
}

export class PageErrorBoundary extends React.Component<PageErrorBoundaryProps, PageErrorBoundaryState> {
  state: PageErrorBoundaryState = { error: undefined };

  static getDerivedStateFromError(error: Error): PageErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Page error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="p-6 max-w-md mx-auto" role="alert">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h2 className="text-lg font-semibold text-red-800 mb-2">Something went wrong</h2>
            <p className="text-red-700 mb-4">This page encountered an error and couldn't load properly.</p>
            <pre className="text-xs text-red-600 bg-red-100 p-2 rounded overflow-auto">
              {this.state.error.message}
            </pre>
            <button 
              onClick={() => this.setState({ error: undefined })}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default PageErrorBoundary;