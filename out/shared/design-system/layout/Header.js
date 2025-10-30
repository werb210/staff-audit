import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Bell, User, LogOut } from "lucide-react";
export function Header({ user, onLogout }) {
    const handleLogout = () => {
        if (onLogout) {
            onLogout();
        }
    };
    return (_jsx("header", { className: "bg-white border-b border-gray-200 shadow-sm", children: _jsxs("div", { className: "flex items-center justify-between h-16 px-6", children: [_jsx("div", { className: "flex items-center", children: _jsx("h1", { className: "text-xl font-semibold text-gray-900", children: "Boreal Financial Platform" }) }), _jsxs("div", { className: "flex items-center space-x-4", children: [_jsx("button", { className: "p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors", children: _jsx(Bell, { className: "h-5 w-5" }) }), user && (_jsxs("div", { className: "flex items-center space-x-3", children: [_jsxs("div", { className: "text-sm text-right", children: [_jsxs("div", { className: "font-medium text-gray-900", children: [user.firstName, " ", user.lastName] }), _jsx("div", { className: "text-gray-500 capitalize", children: user.role })] }), _jsx("div", { className: "relative", children: _jsx("button", { className: "flex items-center p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors", children: _jsx(User, { className: "h-5 w-5" }) }) }), _jsx("button", { onClick: handleLogout, className: "p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors", title: "Sign Out", children: _jsx(LogOut, { className: "h-5 w-5" }) })] }))] })] }) }));
}
// MIGRATION NOTE: This is the unified header component
// Extracted from staff portal and simplified for cross-application use
export default Header;
