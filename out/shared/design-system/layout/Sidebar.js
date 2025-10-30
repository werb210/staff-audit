import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useLocation, Link } from "wouter";
import { LogOut, Home, Users, FileText, Settings } from "lucide-react";
// Default navigation items
const NAV_ITEMS = [
    { name: "Dashboard", href: "/dashboard", icon: Home },
    { name: "Applications", href: "/applications", icon: FileText },
    { name: "Users", href: "/users", icon: Users },
    { name: "Settings", href: "/settings", icon: Settings },
];
export function Sidebar({ user, onLogout }) {
    const [location] = useLocation();
    const handleLogout = () => {
        if (onLogout) {
            onLogout();
        }
    };
    return (_jsxs("div", { className: "flex flex-col w-64 bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 shadow-2xl", children: [_jsx("div", { className: "flex items-center h-16 px-4 bg-gradient-to-r from-blue-600 to-blue-700 shadow-lg", children: _jsxs("div", { className: "flex items-center", children: [_jsx("div", { className: "w-8 h-8 bg-white rounded-lg flex items-center justify-center mr-3", children: _jsx("span", { className: "text-blue-600 font-bold text-lg", children: "B" }) }), _jsxs("div", { children: [_jsx("h1", { className: "text-white font-bold text-lg", children: "Boreal CRM" }), _jsx("p", { className: "text-blue-100 text-xs", children: "Financial Platform" })] })] }) }), user && (_jsx("div", { className: "px-4 py-3 bg-gray-800/50 border-b border-gray-700", children: _jsxs("div", { className: "flex items-center", children: [_jsx("div", { className: "w-8 h-8 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center mr-3", children: _jsxs("span", { className: "text-white text-sm font-medium", children: [user.firstName?.[0], user.lastName?.[0]] }) }), _jsxs("div", { children: [_jsxs("p", { className: "text-white font-medium text-sm", children: [user.firstName, " ", user.lastName] }), _jsx("p", { className: "text-gray-400 text-xs capitalize", children: user.role })] })] }) })), _jsx("nav", { className: "flex-1 px-3 py-4 space-y-1 overflow-y-auto", children: NAV_ITEMS.map((item) => {
                    const isActive = location === item.href ||
                        (item.href !== '/dashboard' && location.startsWith(item.href));
                    return (_jsxs(Link, { href: item.href, className: `group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${isActive
                            ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg"
                            : "text-gray-300 hover:bg-gray-700/50 hover:text-white"}`, children: [_jsx(item.icon, { className: `mr-3 h-5 w-5 ${isActive ? 'text-blue-100' : 'text-gray-400 group-hover:text-gray-300'}` }), item.name, isActive && (_jsx("div", { className: "ml-auto w-1 h-5 bg-blue-300 rounded-full" }))] }, item.name));
                }) }), _jsx("div", { className: "px-3 py-4 border-t border-gray-700", children: _jsxs("button", { onClick: handleLogout, className: "group flex items-center w-full px-3 py-2.5 text-sm font-medium text-gray-300 rounded-lg hover:bg-red-600/20 hover:text-red-300 transition-all duration-200", children: [_jsx(LogOut, { className: "mr-3 h-5 w-5" }), "Sign Out"] }) })] }));
}
// MIGRATION NOTE: This is the unified sidebar component with V2 navigation
// Uses NAV_ITEMS from the V2 navigation system for complete CRM feature access
export default Sidebar;
