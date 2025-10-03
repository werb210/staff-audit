import React, { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";

interface MainLayoutProps {
  children: ReactNode;
  showSidebar?: boolean;
  user?: any;
}

export function MainLayout({ children, showSidebar = true, user }: MainLayoutProps) {
  // Route debugging for development
  if ((import.meta as any).env?.VITE_DEBUG_ROUTES === 'true') {
    console.info('[ROUTE-DEBUG]', window.location.pathname, '->', document.title);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/50 to-gray-100">
      <div className="flex h-screen">
        {showSidebar && <Sidebar user={user} />}
        
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header user={user} />
          
          <main className="flex-1 overflow-y-auto bg-gray-50/80">
            <div className="container mx-auto px-4 py-6">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

// MIGRATION NOTE: This is the unified layout component extracted from staff portal
// All applications should use this instead of their own layout components
export default MainLayout;