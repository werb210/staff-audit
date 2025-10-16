import React from "react";
import LenderProductForm from "../../product-form.jsx";

function part(i){ if (typeof window==="undefined") return null; return window.location.pathname.split("/").filter(Boolean)[i] || null; }
// Expect path: /staff/lenders/<lenderId>/products/<productId>
export default function ViewProductPage(props){
  const lenderId  = props?.lenderId  || part(2);
  const productId = props?.productId || part(4);
  if (!lenderId || !productId) return <div style={{padding:16,color:"#b91c1c"}}>ASK: required URL params missing</div>;
  // Render in "edit" mode but your form can toggle read-only if you prefer
  return <LenderProductForm lenderId={lenderId} productId={productId} />;
}