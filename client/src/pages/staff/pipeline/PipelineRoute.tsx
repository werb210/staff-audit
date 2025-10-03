// hard, self-contained route wrapper that never imports PipelinePage at top-level
import * as React from "react";

/** Simple error boundary that renders the thrown error text */
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { err?: Error }
> {
  state = { err: undefined as Error | undefined };
  static getDerivedStateFromError(err: Error) { return { err }; }
  render() {
    if (this.state.err) {
      return (
        <div style={{ padding: 24 }}>
          <h2>Pipeline failed to load</h2>
          <pre style={{ whiteSpace: "pre-wrap" }}>{String(this.state.err?.stack || this.state.err)}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

function LazyPipeline() {
  // Lazy module import wrapped so a top-level evaluation error rejects the promise
  const Pipeline = React.useMemo(
    () => React.lazy(async () => {
      try {
        const m = await import("@/pages/staff/pipeline/PipelinePage"); // <- never hoist this
        return { default: m.default ?? (m as any).PipelinePage ?? m };
      } catch (e) {
        // rethrow so ErrorBoundary can render it
        throw e;
      }
    }),
    []
  );
  return (
    <React.Suspense fallback={<div style={{ padding: 24 }}>Loading pipeline…</div>}>
      <Pipeline />
    </React.Suspense>
  );
}

export default function PipelineRoute() {
  return (
    <ErrorBoundary>
      <LazyPipeline />
    </ErrorBoundary>
  );
}