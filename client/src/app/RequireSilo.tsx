import { useLocation } from "wouter";
import React from "react";
import { useSilo } from "./useSilo";

export function RequireSilo({ want, children }:{ want:"bf"|"slf", children:React.ReactNode }) {
  const { silo } = useSilo();
  const [, navigate] = useLocation();
  
  if (silo === want) {
    return <>{children}</>;
  }
  
  React.useEffect(() => {
    navigate("/staff", { replace: true });
  }, [navigate]);
  
  return null;
}