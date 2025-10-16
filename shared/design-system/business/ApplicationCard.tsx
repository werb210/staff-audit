import React from "react";
import { Link } from "wouter";
import { Calendar, DollarSign, FileText, User, MoreHorizontal } from "lucide-react";
import { Card, CardContent, CardHeader } from "../ui/card";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";

interface Application {
  id: string;
  status: string;
  business?: {
    businessName?: string;
    industry?: string;
  };
  financial?: {
    requestedAmount?: number;
    annualRevenue?: number;
  };
  createdAt?: string;
  updatedAt?: string;
}

interface ApplicationCardProps {
  application: Application;
  variant?: "default" | "compact" | "detailed";
  userRole?: "client" | "staff" | "admin" | "lender";
  showActions?: boolean;
  onEdit?: (application: Application) => void;
  onView?: (application: Application) => void;
}

const statusConfig = {
  draft: { color: "secondary", label: "Draft" },
  submitted: { color: "info", label: "Submitted" },
  under_review: { color: "warning", label: "Under Review" },
  approved: { color: "success", label: "Approved" },
  declined: { color: "destructive", label: "Declined" },
  funded: { color: "success", label: "Funded" },
} as const;

export function ApplicationCard({ 
  application, 
  variant = "default",
  userRole = "staff",
  showActions = true,
  onEdit,
  onView
}: ApplicationCardProps) {
  const statusInfo = statusConfig[application.status as keyof typeof statusConfig] || statusConfig.draft;
  
  const formatDate = (dateString?: string) => {
    if (!dateString) return "—";
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatAmount = (amount?: number) => {
    if (!amount) return "—";
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
    return (
      <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={handleView}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h4 className="font-medium text-gray-900 truncate">
                {application.business?.businessName || `Application ${application.id.slice(0, 8)}`}
              </h4>
              <div className="flex items-center space-x-2 mt-1">
                <Badge variant={statusInfo.color}>{statusInfo.label}</Badge>
                {application.financial?.requestedAmount && (
                  <span className="text-sm text-gray-500">
                    {formatAmount(application.financial.requestedAmount)}
                  </span>
                )}
              </div>
            </div>
            {showActions && (
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {application.business?.businessName || `Application ${application.id.slice(0, 8)}`}
            </h3>
            <div className="flex items-center space-x-2">
              <Badge variant={statusInfo.color}>{statusInfo.label}</Badge>
              {application.business?.industry && (
                <span className="text-sm text-gray-500">
                  {application.business.industry}
                </span>
              )}
            </div>
          </div>
          {showActions && (
            <div className="flex space-x-2">
              <Link href={getDetailPath()}>
                <Button variant="outline" size="sm" onClick={handleView}>
                  View Details
                </Button>
              </Link>
              {(userRole === "staff" || userRole === "admin") && onEdit && (
                <Button variant="ghost" size="sm" onClick={handleEdit}>
                  Edit
                </Button>
              )}
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center space-x-2">
            <DollarSign className="h-4 w-4 text-gray-400" />
            <div>
              <p className="text-sm text-gray-500">Requested Amount</p>
              <p className="font-medium text-gray-900">
                {formatAmount(application.financial?.requestedAmount)}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Calendar className="h-4 w-4 text-gray-400" />
            <div>
              <p className="text-sm text-gray-500">Submitted</p>
              <p className="font-medium text-gray-900">
                {formatDate(application.createdAt)}
              </p>
            </div>
          </div>

          {variant === "detailed" && (
            <>
              <div className="flex items-center space-x-2">
                <User className="h-4 w-4 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Annual Revenue</p>
                  <p className="font-medium text-gray-900">
                    {formatAmount(application.financial?.annualRevenue)}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <FileText className="h-4 w-4 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Last Updated</p>
                  <p className="font-medium text-gray-900">
                    {formatDate(application.updatedAt)}
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Legacy component wrapper for backwards compatibility
export default ApplicationCard;

// MIGRATION NOTE: This consolidated component replaces both staff and client ApplicationCard implementations
// Supports role-based rendering and multiple display variants for different use cases