import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import UnifiedProductForm from "./UnifiedProductForm";

export default function LenderProductsPageUnified() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Lender Products (Unified)</h1>
          <p className="text-muted-foreground">Manage lender products with the unified form</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Product Management</CardTitle>
        </CardHeader>
        <CardContent>
          <UnifiedProductForm
            lenderId=""
            onSave={() => {
              console.log("Product saved");
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}