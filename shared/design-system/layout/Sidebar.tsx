import React from "react";
import { useLocation, Link } from "wouter";
import { LogOut, Home, Users, FileText, Settings } from "lucide-react";

// Default navigation items
const NAV_ITEMS = [
  { name: "Dashboard", href: "/dashboard", icon: Home },
  { name: "Applications", href: "/applications", icon: FileText },
  { name: "Users", href: "/users", icon: Users },
  { name: "Settings", href: "/settings", icon: Settings },
];

interface SidebarProps {
  user?: any;
  onLogout?: () => void;
}

export function Sidebar({ user, onLogout }: SidebarProps) {
  const [location] = useLocation();

  const handleLogout = () => {
    if (onLogout) {
      onLogout();
    }
  };

  return (
    <div className="flex flex-col w-64 bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 shadow-2xl">
      {/* Header */}
      <div className="flex items-center h-16 px-4 bg-gradient-to-r from-blue-600 to-blue-700 shadow-lg">
        <div className="flex items-center">
          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center mr-3">
            <span className="text-blue-600 font-bold text-lg">B</span>
          </div>
          <div>
            <h1 className="text-white font-bold text-lg">Boreal CRM</h1>
            <p className="text-blue-100 text-xs">Financial Platform</p>
          </div>
        </div>
      </div>

      {/* User Info */}
      {user && (
        <div className="px-4 py-3 bg-gray-800/50 border-b border-gray-700">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center mr-3">
              <span className="text-white text-sm font-medium">
                {user.firstName?.[0]}{user.lastName?.[0]}
              </span>
            </div>
            <div>
              <p className="text-white font-medium text-sm">
                {user.firstName} {user.lastName}
              </p>
              <p className="text-gray-400 text-xs capitalize">{user.role}</p>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item: any) => {
          const isActive = location === item.href || 
            (item.href !== '/dashboard' && location.startsWith(item.href));
          
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${
                isActive
                  ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg"
                  : "text-gray-300 hover:bg-gray-700/50 hover:text-white"
              }`}
            >
              <item.icon className={`mr-3 h-5 w-5 ${isActive ? 'text-blue-100' : 'text-gray-400 group-hover:text-gray-300'}`} />
              {item.name}
              {isActive && (
                <div className="ml-auto w-1 h-5 bg-blue-300 rounded-full" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Logout Button */}
      <div className="px-3 py-4 border-t border-gray-700">
        <button
          onClick={handleLogout}
          className="group flex items-center w-full px-3 py-2.5 text-sm font-medium text-gray-300 rounded-lg hover:bg-red-600/20 hover:text-red-300 transition-all duration-200"
        >
          <LogOut className="mr-3 h-5 w-5" />
          Sign Out
        </button>
      </div>
    </div>
  );
}

// MIGRATION NOTE: This is the unified sidebar component with V2 navigation
// Uses NAV_ITEMS from the V2 navigation system for complete CRM feature access
export default Sidebar;