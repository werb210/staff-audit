/**
 * SHA256 CHECKSUM UTILITIES - Document Reliability Upgrade
 * Provides file integrity validation and corruption detection
 */

import crypto from 'crypto';
import fs from 'fs/promises';

/**
 * Compute SHA256 checksum for buffer
 * @param buffer File buffer
 * @returns SHA256 hex string
 */
export function computeChecksum(buffer: Buffer): string {
  const hash = crypto.createHash('sha256');
  hash.update(buffer);
  return hash.digest('hex');
}

/**
 * Compute SHA256 checksum for file on disk
 * @param filePath Path to file
 * @returns SHA256 hex string
 */
export async function computeFileChecksum(filePath: string): Promise<string> {
  try {
    const buffer = await fs.readFile(filePath);
    return computeChecksum(buffer);
  } catch (error: unknown) {
    console.error(`❌ [CHECKSUM] Failed to compute checksum for ${filePath}:`, error);
    throw error;
  }
}

/**
 * Validate file integrity by comparing checksums
 * @param filePath Path to file
 * @param expectedChecksum Expected SHA256 checksum
 * @returns True if checksums match
 */
export async function validateFileIntegrity(filePath: string, expectedChecksum: string): Promise<boolean> {
  try {
    const actualChecksum = await computeFileChecksum(filePath);
    const isValid = actualChecksum === expectedChecksum;
    
    if (!isValid) {
      console.error(`❌ [CHECKSUM] Integrity check failed for ${filePath}`);
      console.error(`   Expected: ${expectedChecksum}`);
      console.error(`   Actual:   ${actualChecksum}`);
    } else {
      console.log(`✅ [CHECKSUM] Integrity validated for ${filePath}`);
    }
    
    return isValid;
  } catch (error: unknown) {
    console.error(`❌ [CHECKSUM] Validation error for ${filePath}:`, error);
    return false;
  }
}

/**
 * Validate buffer integrity by comparing checksums
 * @param buffer File buffer
 * @param expectedChecksum Expected SHA256 checksum
 * @returns True if checksums match
 */
export function validateBufferIntegrity(buffer: Buffer, expectedChecksum: string): boolean {
  const actualChecksum = computeChecksum(buffer);
  const isValid = actualChecksum === expectedChecksum;
  
  if (!isValid) {
    console.error(`❌ [CHECKSUM] Buffer integrity check failed`);
    console.error(`   Expected: ${expectedChecksum}`);
    console.error(`   Actual:   ${actualChecksum}`);
  }
  
  return isValid;
}