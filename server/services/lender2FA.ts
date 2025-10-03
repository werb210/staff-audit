/**
 * Lender 2FA Service - TEMPORARILY DISABLED DURING SCHEMA MIGRATION
 * Integrates mobile phone field with Twilio for lender authentication
 */

interface Lender2FAResult {
  success: boolean;
  error?: string;
  sid?: string;
  status?: string;
}

export class Lender2FAService {
  /**
   * Send 2FA code to lender's mobile phone - TEMPORARILY DISABLED
   */
  static async sendLender2FA(lenderId: string): Promise<Lender2FAResult> {
    console.log('Lender 2FA service temporarily disabled during schema migration');
    return {
      success: false,
      error: 'Lender 2FA temporarily disabled during schema migration'
    };
  }

  /**
   * Verify 2FA code for lender - TEMPORARILY DISABLED
   */
  static async verifyLender2FA(lenderId: string, code: string): Promise<Lender2FAResult> {
    console.log('Lender 2FA verification temporarily disabled during schema migration');
    return {
      success: false,
      error: 'Lender 2FA verification temporarily disabled during schema migration'
    };
  }

  /**
   * Get lender phone - TEMPORARILY DISABLED
   */
  static async getLenderPhone(lenderId: string): Promise<{ success: boolean; phone?: string; error?: string }> {
    console.log('Lender phone lookup temporarily disabled during schema migration');
    return {
      success: false,
      error: 'Lender phone lookup temporarily disabled during schema migration'
    };
  }

  /**
   * Update lender phone - TEMPORARILY DISABLED
   */
  static async updateLenderPhone(lenderId: string, phone: string): Promise<Lender2FAResult> {
    console.log('Lender phone update temporarily disabled during schema migration');
    return {
      success: false,
      error: 'Lender phone update temporarily disabled during schema migration'
    };
  }
}