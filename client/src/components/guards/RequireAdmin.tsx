import React from "react";
import { useLocation } from "wouter";
import { useMe } from "@/hooks/useMe";

interface RequireAdminProps {
  children: React.ReactNode;
}

export default function RequireAdmin({ children }: RequireAdminProps) {
  const [, navigate] = useLocation();
  const { data: me, isLoading } = useMe();

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <div className="text-gray-600">Checking access permissions...</div>
        </div>
      </div>
    );
  }

  if (!me) {
    React.useEffect(() => {
      const currentPath = window.location.pathname + window.location.search;
      navigate(`/login?next=${encodeURIComponent(currentPath)}`, {
        replace: true,
      });
    }, [navigate]);
    return null;
  }

  if (!me.roles?.includes("admin")) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-red-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Access denied
              </h3>
              <div className="mt-2 text-sm text-red-700">
                You need administrator privileges to access this page.
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Future MFA check - for now just return children
  if (me.mfaRequired && !me.mfaVerified) {
    React.useEffect(() => {
      navigate("/verify", { replace: true });
    }, [navigate]);
    return null;
  }

  return <>{children}</>;
}
