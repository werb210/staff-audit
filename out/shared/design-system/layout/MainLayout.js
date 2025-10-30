import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
export function MainLayout({ children, showSidebar = true, user }) {
    // Route debugging for development
    if (import.meta.env?.VITE_DEBUG_ROUTES === 'true') {
        console.info('[ROUTE-DEBUG]', window.location.pathname, '->', document.title);
    }
    return (_jsx("div", { className: "min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/50 to-gray-100", children: _jsxs("div", { className: "flex h-screen", children: [showSidebar && _jsx(Sidebar, { user: user }), _jsxs("div", { className: "flex-1 flex flex-col overflow-hidden", children: [_jsx(Header, { user: user }), _jsx("main", { className: "flex-1 overflow-y-auto bg-gray-50/80", children: _jsx("div", { className: "container mx-auto px-4 py-6", children: children }) })] })] }) }));
}
// MIGRATION NOTE: This is the unified layout component extracted from staff portal
// All applications should use this instead of their own layout components
export default MainLayout;
