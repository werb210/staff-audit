import React from "react";
import { listLenderProducts, createLenderProduct, updateLenderProduct } from "@/features/lenders/actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { lower } from '@/lib/dedupe';

export default function LenderProductsPage() {
  const [rows,setRows]=React.useState<any[]>([]); 
  const [q,setQ]=React.useState(""); 
  const [edit,setEdit]=React.useState<any|null>(null);
  const [loading, setLoading] = React.useState(true);
  
  const load=React.useCallback(async()=>{ 
    try {
      setLoading(true);
      const d=await listLenderProducts(); 
      setRows(d?.products ?? d ?? []); 
    } catch (error) {
      console.error('Failed to load lender products:', error);
    } finally {
      setLoading(false);
    }
  },[]);
  
  React.useEffect(()=>{ load(); },[load]);
  
  const filtered=rows.filter(r=>lower([r.name,r.status,String(r.rate??""),String(r.termMonths??"")].join(" ")).includes(lower(q)));
  
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Lender Products</h1>
          <p className="text-muted-foreground">Manage lender products, rates, and terms</p>
        </div>
        <div className="flex gap-3">
          <Input 
            className="w-64" 
            placeholder="Filter products..." 
            value={q} 
            onChange={e=>setQ(e.target.value)}
          />
          <Button onClick={()=>setEdit({name:"",lenderId:"",rate:null,termMonths:null,status:"active"})}>
            New Product
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Products ({filtered.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading products...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Lender ID</TableHead>
                  <TableHead>Rate (%)</TableHead>
                  <TableHead>Term (months)</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No products found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map(product=>(
                    <TableRow key={product.id}>
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell>{product.lenderId}</TableCell>
                      <TableCell>{product.rate ?? "—"}</TableCell>
                      <TableCell>{product.termMonths ?? "—"}</TableCell>
                      <TableCell>
                        <span className={`inline-flex px-2 py-1 text-xs rounded-full ${
                          product.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {product.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" onClick={()=>setEdit(product)}>
                          Edit
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit/Create Product Modal */}
      {edit && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle>{edit.id ? 'Edit Product' : 'New Product'}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Name</label>
                <Input 
                  placeholder="Product name" 
                  value={edit.name||""} 
                  onChange={e=>setEdit({...edit,name:e.target.value})}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Lender ID</label>
                <Input 
                  placeholder="Lender identifier" 
                  value={edit.lenderId||""} 
                  onChange={e=>setEdit({...edit,lenderId:e.target.value})}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Rate (%)</label>
                <Input 
                  placeholder="Interest rate" 
                  type="number" 
                  step="0.01" 
                  value={edit.rate??""} 
                  onChange={e=>setEdit({...edit,rate:e.target.valueAsNumber})}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Term (months)</label>
                <Input 
                  placeholder="Loan term in months" 
                  type="number" 
                  value={edit.termMonths??""} 
                  onChange={e=>setEdit({...edit,termMonths:e.target.valueAsNumber})}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Status</label>
                <Select value={edit.status||"active"} onValueChange={val=>setEdit({...edit,status:val})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2 pt-4">
                <Button 
                  onClick={async()=>{
                    try {
                      if (edit.id) {
                        await updateLenderProduct(edit.id, edit);
                      } else {
                        await createLenderProduct(edit);
                      }
                      setEdit(null); 
                      await load();
                    } catch (error: any) {
                      alert('Failed to save: ' + (error.message || error));
                    }
                  }}
                  className="flex-1"
                >
                  Save
                </Button>
                <Button variant="outline" onClick={()=>setEdit(null)} className="flex-1">
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}