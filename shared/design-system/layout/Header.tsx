import React from "react";
import { Bell, User, Settings, LogOut } from "lucide-react";

interface HeaderProps {
  user?: any;
  onLogout?: () => void;
}

export function Header({ user, onLogout }: HeaderProps) {
  const handleLogout = () => {
    if (onLogout) {
      onLogout();
    }
  };

  return (
    <header className="bg-white border-b border-gray-200 shadow-sm">
      <div className="flex items-center justify-between h-16 px-6">
        {/* Left side - could add breadcrumbs or search */}
        <div className="flex items-center">
          <h1 className="text-xl font-semibold text-gray-900">
            Boreal Financial Platform
          </h1>
        </div>

        {/* Right side - user controls */}
        <div className="flex items-center space-x-4">
          {/* Notifications */}
          <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            <Bell className="h-5 w-5" />
          </button>

          {/* User menu */}
          {user && (
            <div className="flex items-center space-x-3">
              <div className="text-sm text-right">
                <div className="font-medium text-gray-900">{user.firstName} {user.lastName}</div>
                <div className="text-gray-500 capitalize">{user.role}</div>
              </div>
              
              <div className="relative">
                <button className="flex items-center p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                  <User className="h-5 w-5" />
                </button>
              </div>

              <button 
                onClick={handleLogout}
                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Sign Out"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

// MIGRATION NOTE: This is the unified header component
// Extracted from staff portal and simplified for cross-application use
export default Header;