/**
 * Google Ads Click ID Tracking
 * Captures gclid, gbraid, wbraid from URL parameters and persists them
 */
import { lower } from '@/lib/dedupe';

export interface ClickIds {
  gclid?: string;
  gbraid?: string;
  wbraid?: string;
  clickTime?: string;
}

/**
 * Extract click IDs from current URL and persist to localStorage
 * Call this on app start and form submissions
 */
export function persistClickIds(): ClickIds {
  const url = new URL(window.location.href);
  const gclid = url.searchParams.get("gclid");
  const gbraid = url.searchParams.get("gbraid");
  const wbraid = url.searchParams.get("wbraid");
  
  // If we have any click IDs, store them with timestamp
  if (gclid || gbraid || wbraid) {
    const clickTime = new Date().toISOString();
    localStorage.setItem("ads.gclid", gclid || "");
    localStorage.setItem("ads.gbraid", gbraid || "");
    localStorage.setItem("ads.wbraid", wbraid || "");
    localStorage.setItem("ads.clickTime", clickTime);
  }
  
  return {
    gclid: localStorage.getItem("ads.gclid") || undefined,
    gbraid: localStorage.getItem("ads.gbraid") || undefined,
    wbraid: localStorage.getItem("ads.wbraid") || undefined,
    clickTime: localStorage.getItem("ads.clickTime") || undefined,
  };
}

/**
 * Get stored click IDs without extracting from URL
 */
export function getStoredClickIds(): ClickIds {
  return {
    gclid: localStorage.getItem("ads.gclid") || undefined,
    gbraid: localStorage.getItem("ads.gbraid") || undefined,
    wbraid: localStorage.getItem("ads.wbraid") || undefined,
    clickTime: localStorage.getItem("ads.clickTime") || undefined,
  };
}

/**
 * Clear stored click IDs (useful after successful conversion)
 */
export function clearClickIds(): void {
  localStorage.removeItem("ads.gclid");
  localStorage.removeItem("ads.gbraid");
  localStorage.removeItem("ads.wbraid");
  localStorage.removeItem("ads.clickTime");
}

/**
 * Enhanced conversions: hash PII for Google Ads
 * Call after form submission with user email/phone
 */
export async function sendEnhancedConversion(data: {
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  conversionAction: string;
  conversionValue?: number;
}) {
  try {
    // Hash PII data using SubtleCrypto API
    const hashedData: any = {};
    
    if (data.email) {
      const emailBuffer = new TextEncoder().encode(lower(data.email).trim());
      const emailHash = await crypto.subtle.digest('SHA-256', emailBuffer);
      hashedData.hashedEmail = Array.from(new Uint8Array(emailHash))
        .map(b => b.toString(16).padStart(2, '0')).join('');
    }
    
    if (data.phone) {
      // Normalize phone number (remove non-digits, add country code if needed)
      const normalizedPhone = data.phone.replace(/\D/g, '');
      const phoneWithCountry = normalizedPhone.startsWith('1') ? normalizedPhone : `1${normalizedPhone}`;
      const phoneBuffer = new TextEncoder().encode(phoneWithCountry);
      const phoneHash = await crypto.subtle.digest('SHA-256', phoneBuffer);
      hashedData.hashedPhoneNumber = Array.from(new Uint8Array(phoneHash))
        .map(b => b.toString(16).padStart(2, '0')).join('');
    }
    
    if (data.firstName) {
      const nameBuffer = new TextEncoder().encode(lower(data.firstName).trim());
      const nameHash = await crypto.subtle.digest('SHA-256', nameBuffer);
      hashedData.hashedFirstName = Array.from(new Uint8Array(nameHash))
        .map(b => b.toString(16).padStart(2, '0')).join('');
    }
    
    if (data.lastName) {
      const lastNameBuffer = new TextEncoder().encode(lower(data.lastName).trim());
      const lastNameHash = await crypto.subtle.digest('SHA-256', lastNameBuffer);
      hashedData.hashedLastName = Array.from(new Uint8Array(lastNameHash))
        .map(b => b.toString(16).padStart(2, '0')).join('');
    }
    
    // Send enhanced conversion via gtag if available
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'conversion', {
        send_to: data.conversionAction,
        value: data.conversionValue || 0,
        currency: 'CAD',
        user_data: hashedData
      });
    }
    
    return true;
  } catch (error) {
    console.error('Enhanced conversion error:', error);
    return false;
  }
}