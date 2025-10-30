import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { Link } from "wouter";
import { Calendar, DollarSign, FileText, User, MoreHorizontal } from "lucide-react";
import { Card, CardContent, CardHeader } from "../ui/card";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
const statusConfig = {
    draft: { color: "secondary", label: "Draft" },
    submitted: { color: "info", label: "Submitted" },
    under_review: { color: "warning", label: "Under Review" },
    approved: { color: "success", label: "Approved" },
    declined: { color: "destructive", label: "Declined" },
    funded: { color: "success", label: "Funded" },
};
export function ApplicationCard({ application, variant = "default", userRole = "staff", showActions = true, onEdit, onView }) {
    const statusInfo = statusConfig[application.status] || statusConfig.draft;
    const formatDate = (dateString) => {
        if (!dateString)
            return "—";
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };
    const formatAmount = (amount) => {
        if (!amount)
            return "—";
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount);
    };
    const getDetailPath = () => {
        switch (userRole) {
            case "client":
                return `/applications/${application.id}`;
            case "staff":
            case "admin":
                return `/dashboard/applications/${application.id}`;
            case "lender":
                return `/lender/applications/${application.id}`;
            default:
                return `/applications/${application.id}`;
        }
    };
    const handleView = () => {
        if (onView) {
            onView(application);
        }
    };
    const handleEdit = () => {
        if (onEdit) {
            onEdit(application);
        }
    };
    if (variant === "compact") {
        return (_jsx(Card, { className: "hover:shadow-md transition-shadow cursor-pointer", onClick: handleView, children: _jsx(CardContent, { className: "p-4", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { className: "flex-1", children: [_jsx("h4", { className: "font-medium text-gray-900 truncate", children: application.business?.businessName || `Application ${application.id.slice(0, 8)}` }), _jsxs("div", { className: "flex items-center space-x-2 mt-1", children: [_jsx(Badge, { variant: statusInfo.color, children: statusInfo.label }), application.financial?.requestedAmount && (_jsx("span", { className: "text-sm text-gray-500", children: formatAmount(application.financial.requestedAmount) }))] })] }), showActions && (_jsx(Button, { variant: "ghost", size: "icon", children: _jsx(MoreHorizontal, { className: "h-4 w-4" }) }))] }) }) }));
    }
    return (_jsxs(Card, { className: "hover:shadow-md transition-shadow", children: [_jsx(CardHeader, { className: "pb-3", children: _jsxs("div", { className: "flex items-start justify-between", children: [_jsxs("div", { className: "flex-1", children: [_jsx("h3", { className: "text-lg font-semibold text-gray-900 mb-2", children: application.business?.businessName || `Application ${application.id.slice(0, 8)}` }), _jsxs("div", { className: "flex items-center space-x-2", children: [_jsx(Badge, { variant: statusInfo.color, children: statusInfo.label }), application.business?.industry && (_jsx("span", { className: "text-sm text-gray-500", children: application.business.industry }))] })] }), showActions && (_jsxs("div", { className: "flex space-x-2", children: [_jsx(Link, { href: getDetailPath(), children: _jsx(Button, { variant: "outline", size: "sm", onClick: handleView, children: "View Details" }) }), (userRole === "staff" || userRole === "admin") && onEdit && (_jsx(Button, { variant: "ghost", size: "sm", onClick: handleEdit, children: "Edit" }))] }))] }) }), _jsx(CardContent, { className: "pt-0", children: _jsxs("div", { className: "grid grid-cols-2 gap-4", children: [_jsxs("div", { className: "flex items-center space-x-2", children: [_jsx(DollarSign, { className: "h-4 w-4 text-gray-400" }), _jsxs("div", { children: [_jsx("p", { className: "text-sm text-gray-500", children: "Requested Amount" }), _jsx("p", { className: "font-medium text-gray-900", children: formatAmount(application.financial?.requestedAmount) })] })] }), _jsxs("div", { className: "flex items-center space-x-2", children: [_jsx(Calendar, { className: "h-4 w-4 text-gray-400" }), _jsxs("div", { children: [_jsx("p", { className: "text-sm text-gray-500", children: "Submitted" }), _jsx("p", { className: "font-medium text-gray-900", children: formatDate(application.createdAt) })] })] }), variant === "detailed" && (_jsxs(_Fragment, { children: [_jsxs("div", { className: "flex items-center space-x-2", children: [_jsx(User, { className: "h-4 w-4 text-gray-400" }), _jsxs("div", { children: [_jsx("p", { className: "text-sm text-gray-500", children: "Annual Revenue" }), _jsx("p", { className: "font-medium text-gray-900", children: formatAmount(application.financial?.annualRevenue) })] })] }), _jsxs("div", { className: "flex items-center space-x-2", children: [_jsx(FileText, { className: "h-4 w-4 text-gray-400" }), _jsxs("div", { children: [_jsx("p", { className: "text-sm text-gray-500", children: "Last Updated" }), _jsx("p", { className: "font-medium text-gray-900", children: formatDate(application.updatedAt) })] })] })] }))] }) })] }));
}
// Legacy component wrapper for backwards compatibility
export default ApplicationCard;
