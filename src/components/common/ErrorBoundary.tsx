import React from "react";
type Props = { children: React.ReactNode, fallback?: React.ReactNode };
type State = { hasError: boolean, err?: any };
export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(p:Props){ super(p); this.state = { hasError:false }; }
  static getDerivedStateFromError(err:any){ return { hasError:true, err }; }
  componentDidCatch(err:any, info:any){ console.error("TasksCalendar error:", err, info); }
  render(){
    if(this.state.hasError) return this.props.fallback ?? (
      <div className="p-6">
        <h2 className="text-lg font-semibold">Something went wrong</h2>
        <p className="text-sm text-gray-600 mt-2">The Tasks & Calendar view failed to render. Please reload or contact support.</p>
      </div>
    );
    return this.props.children as any;
  }
}