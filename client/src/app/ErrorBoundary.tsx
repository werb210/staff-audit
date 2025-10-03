import React from "react";

type State = { hasError: boolean; err?: any };
export default class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { hasError: false };
  static getDerivedStateFromError(err: any) { return { hasError: true, err }; }
  componentDidCatch(error: any, info: any) { console.error("[ErrorBoundary]", error, info); }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 24, fontFamily: "system-ui" }}>
          <h1>Something went wrong.</h1>
          <p style={{ color: "#6b7280" }}>The UI recovered and logs are in the console.</p>
          <pre style={{ background: "#f3f4f6", padding: 12, borderRadius: 8, overflow: "auto" }}>
            {String(this.state.err?.message || this.state.err || "Unknown error")}
          </pre>
          <button onClick={() => this.setState({ hasError: false, err: undefined })} style={{ marginTop: 12, padding: "6px 12px" }}>
            Dismiss
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}