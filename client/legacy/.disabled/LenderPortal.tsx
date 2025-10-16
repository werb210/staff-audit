import React from "react";
export default function LenderPortal(){
  const [products,setProducts]=React.useState<any[]>([]);
  const [apps, setApps] = React.useState<any[]>([]);
  
  React.useEffect(()=>{ 
    fetch("/api/lender/me/products",{credentials:"include"}).then(r=>r.json()).then(j=>setProducts(j.items||[]));
    fetch("/api/lender/me/apps",{credentials:"include"}).then(r=>r.json()).then(j=>setApps(j.items||[]));
  },[]);

  return (
    <div className="p-4 space-y-6">
      <div className="text-2xl font-semibold">Lender Portal</div>
      
      <div className="border rounded-lg p-4">
        <h3 className="text-lg font-medium mb-3">My Products</h3>
        <div className="grid gap-3">
          {products.map(p => (
            <div key={p.id} className="border rounded p-3 flex justify-between items-center">
              <div>
                <div className="font-medium">{p.name}</div>
                <div className="text-sm text-gray-600">
                  ${p.minAmount?.toLocaleString()} - ${p.maxAmount?.toLocaleString()} at {p.rate}%
                </div>
              </div>
              <button className="px-3 py-1 rounded border text-sm">Edit</button>
            </div>
          ))}
          {products.length === 0 && (
            <div className="text-gray-500 text-center py-4">No products configured</div>
          )}
        </div>
      </div>

      <div className="border rounded-lg p-4">
        <h3 className="text-lg font-medium mb-3">Pending Applications</h3>
        <div className="text-gray-500 text-center py-4">
          {apps.length === 0 ? "No applications pending review" : "Loading applications..."}
        </div>
      </div>
    </div>
  );
}