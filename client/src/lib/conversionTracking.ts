/**
 * Google Ads Conversion Tracking Utilities
 * Upload offline conversions when applications reach different stages
 */

import { getStoredClickIds } from "./adsTracking";
import { lower } from '@/lib/dedupe';

export interface ConversionData {
  applicationId: string;
  stage: 'lead' | 'qualified' | 'funded';
  commissionValue?: number;
  currency?: string;
  conversionTime?: string;
}

/**
 * Upload offline conversion to Google Ads
 * Call this when an application changes stage (new -> qualified -> funded)
 */
export async function uploadConversion(data: ConversionData): Promise<boolean> {
  try {
    // Get click IDs from localStorage (captured during initial visit)
    const clickIds = getStoredClickIds();
    
    if (!clickIds.gclid && !clickIds.gbraid && !clickIds.wbraid) {
      console.log('📊 [ADS] No click IDs found for application', data.applicationId);
      return false;
    }

    console.log('📊 [ADS] Uploading conversion:', {
      ...data,
      hasClickIds: !!(clickIds.gclid || clickIds.gbraid || clickIds.wbraid)
    });

    const response = await fetch('/api/offline-conversion', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        applicationId: data.applicationId,
        stage: data.stage,
        commissionValue: data.commissionValue || 0,
        currency: data.currency || 'CAD',
        conversionTime: data.conversionTime || new Date().toISOString()
      })
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('📊 [ADS] Conversion upload failed:', error);
      return false;
    }

    const result = await response.json();
    
    if (result.simulated) {
      console.log('📊 [ADS] Simulated conversion (sandbox mode):', result);
    } else {
      console.log('📊 [ADS] Conversion uploaded successfully:', result);
    }

    return true;
  } catch (error) {
    console.error('📊 [ADS] Conversion upload error:', error);
    return false;
  }
}

/**
 * Track different application stages with appropriate commission values
 */
export const trackApplicationStage = {
  /**
   * Track initial lead submission (typically $0 value)
   */
  lead: (applicationId: string) => uploadConversion({
    applicationId,
    stage: 'lead',
    commissionValue: 0
  }),

  /**
   * Track qualified lead (pre-qualified for lending)
   */
  qualified: (applicationId: string, estimatedLoanValue?: number) => uploadConversion({
    applicationId,
    stage: 'qualified',
    commissionValue: estimatedLoanValue ? Math.round(estimatedLoanValue * 0.02) : 100 // 2% estimated commission
  }),

  /**
   * Track funded deal (actual commission earned)
   */
  funded: (applicationId: string, actualCommission: number) => uploadConversion({
    applicationId,
    stage: 'funded',
    commissionValue: actualCommission
  })
};

/**
 * Integration example for application status changes
 * Call this whenever an application status changes in your CRM
 */
export function handleApplicationStatusChange(
  applicationId: string, 
  newStatus: string, 
  data?: { loanAmount?: number; commission?: number }
) {
  switch (lower(newStatus)) {
    case 'submitted':
    case 'new':
      trackApplicationStage.lead(applicationId);
      break;
      
    case 'qualified':
    case 'approved':
    case 'pre-qualified':
      trackApplicationStage.qualified(applicationId, data?.loanAmount);
      break;
      
    case 'funded':
    case 'completed':
    case 'closed':
      if (data?.commission) {
        trackApplicationStage.funded(applicationId, data.commission);
      }
      break;
      
    default:
      console.log('📊 [ADS] No conversion tracking for status:', newStatus);
  }
}