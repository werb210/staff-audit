import { useLocation } from "wouter";
import React from "react";
import { useAuth } from "./useAuth";

export default function Protected({ children }:{ children: JSX.Element }){
  const { user, loading } = useAuth();
  const [, navigate] = useLocation();

  if (loading) return <div className="p-4 text-gray-500">Loading...</div>; // don't redirect while loading

  if (!loading && !user) {
    React.useEffect(() => {
      navigate("/staff/login", { replace: true });
    }, [navigate]);
    return null;
  }

  // SAFE role normalization
  const role = typeof user?.role === "string" ? user.role.toLowerCase() : "";
  
  return <>{children}</>;
}