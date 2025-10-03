import React from 'react';
import GoogleAdsIntegration from '@/components/admin/GoogleAdsIntegration';

export default function GoogleAdsSettings() {
  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Google Ads Integration</h1>
        <p className="text-muted-foreground mt-2">
          Configure Google Ads for commission-based conversion tracking and ROAS optimization
        </p>
      </div>
      
      <GoogleAdsIntegration />
    </div>
  );
}