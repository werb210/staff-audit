import React from "react";
import LenderProductForm from "../product-form.jsx";

// Best-effort param extraction (works for SPA dev + SSR-less)
function getParamFromPath(index){
  if (typeof window === "undefined") return null;
  const parts = window.location.pathname.split("/").filter(Boolean);
  return parts[index] || null;
}
// Expect path like: /staff/lenders/<lenderId>/products/new
export default function NewProductPage(props){
  const lenderId = props?.lenderId || getParamFromPath(2);
  if (!lenderId) return <div style={{padding:16,color:"#b91c1c"}}>ASK: lenderId not found in URL</div>;
  return <LenderProductForm lenderId={lenderId} productId={null} />;
}