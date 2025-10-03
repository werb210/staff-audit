import React from 'react';
import RefreshApplicationData from '@/components/admin/RefreshApplicationData';

export default function RefreshDataPage() {
  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Application Data Refresh</h1>
        <p className="text-muted-foreground mt-2">
          Refresh all application cards to ensure complete field population and document visibility
        </p>
      </div>
      
      <RefreshApplicationData />
    </div>
  );
}