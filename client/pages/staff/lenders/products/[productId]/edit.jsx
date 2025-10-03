import React from "react";
import LenderProductForm from "../../product-form.jsx";

function pathPart(i){ if (typeof window==="undefined") return null; return window.location.pathname.split("/").filter(Boolean)[i] || null; }
// Expect path: /staff/lenders/<lenderId>/products/<productId>/edit
export default function EditProductPage(props){
  const lenderId  = props?.lenderId  || pathPart(2);
  const productId = props?.productId || pathPart(4);
  if (!lenderId || !productId) return <div style={{padding:16,color:"#b91c1c"}}>ASK: required URL params missing</div>;
  return <LenderProductForm lenderId={lenderId} productId={productId} />;
}