/**
 * REPLIT OBJECT STORAGE - Document Reliability Upgrade
 * Provides persistent cloud backup for all documents
 */

import { Client } from '@replit/object-storage';
import { Readable } from 'stream';

let client: Client | null = null;
let clientInitialized = false;

function getClient(): Client | null {
  if (clientInitialized) {
    return client;
  }
  
  // In development mode, skip Object Storage entirely and use local fallback
  if (process.env.NODE_ENV === 'development') {
    console.warn('⚠️ [OBJECT STORAGE] Development mode - using local fallback only');
    client = null;
    clientInitialized = true;
    return client;
  }
  
  try {
    client = new Client();
    
    console.log('✅ [OBJECT STORAGE] Client initialized successfully');
    console.log('✅ [OBJECT STORAGE] Ready for document backup operations');
  } catch (error: unknown) {
    console.error('❌ [OBJECT STORAGE] Failed to initialize client:', error instanceof Error ? error instanceof Error ? error.message : String(error) : error);
    
    // Object Storage unavailable - graceful fallback
    console.warn('⚠️ [OBJECT STORAGE] Using disk-only storage (Object Storage unavailable)');
    client = null;
  }
  
  clientInitialized = true;
  return client;
}

/**
 * @param buffer File buffer data
 * @param originalName Original filename for reference
 * @returns Storage key for retrieval
 */
export async function uploadToStorage(buffer: Buffer, originalName: string): Promise<string> {
  const client = getClient();
  if (!client) {
    console.error(`❌ [OBJECT STORAGE] Client not available - no fallback allowed`);
    
    // FALLBACK DISABLED: Azure must be used
    throw new Error("❌ Fallback upload disabled: Azure must be used");
  }
  
  try {
    const { randomUUID } = await import('crypto');
    const uuid = randomUUID();
    const storageKey = `documents/${uuid}-${originalName}`;
    
    console.log(`☁️ [OBJECT STORAGE] Uploading to storage: ${storageKey}`);
    console.log(`☁️ [OBJECT STORAGE] Buffer size: ${buffer.length} bytes`);
    
    await client.uploadFromBytes(storageKey, buffer);
    
    console.log(`✅ [OBJECT STORAGE] Successfully uploaded: ${storageKey}`);
    console.log(`✅ [OBJECT STORAGE] File: ${originalName} -> ${storageKey}`);
    
    return storageKey;
  } catch (error: unknown) {
    console.error(`❌ [OBJECT STORAGE] Upload failed for ${originalName}:`, error);
    console.error(`❌ [OBJECT STORAGE] Error message:`, error instanceof Error ? error instanceof Error ? error.message : String(error) : error);
    
    // NO FALLBACK - throw error to force proper Azure integration
    console.error(`❌ [OBJECT STORAGE] Upload failed - no fallback allowed`);
    throw new Error(`Object Storage upload failed for ${originalName}: ${error instanceof Error ? error instanceof Error ? error.message : String(error) : error}`);
  }
}

/**
 * @param storageKey Storage key from upload
 * @returns Readable stream or null if not found
 */
export async function getStorageStream(storageKey: string): Promise<Readable | null> {
  const client = getClient();
  if (!client || storageKey.startsWith('local-')) {
    console.info(`ℹ️ [OBJECT STORAGE] Client not available or local-only key: ${storageKey}`);
    return null;
  }
  
  try {
    console.log(`☁️ [OBJECT STORAGE] Retrieving from storage: ${storageKey}`);
    
    const bytes = await client.downloadAsBytes(storageKey);
    const stream = Readable.from(Buffer.from(bytes));
    
    console.log(`✅ [OBJECT STORAGE] Successfully retrieved: ${storageKey}`);
    return stream;
  } catch (error: unknown) {
    console.error(`❌ [OBJECT STORAGE] Download failed for ${storageKey}:`, error);
    return null;
  }
}

/**
 * @param storageKey Storage key to delete
 * @returns Success boolean
 */
export async function deleteFromStorage(storageKey: string): Promise<boolean> {
  try {
    console.log(`☁️ [OBJECT STORAGE] Deleting from storage: ${storageKey}`);
    
    await client.delete(storageKey);
    
    console.log(`✅ [OBJECT STORAGE] Successfully deleted: ${storageKey}`);
    return true;
  } catch (error: unknown) {
    console.error(`❌ [OBJECT STORAGE] Delete failed for ${storageKey}:`, error);
    return false;
  }
}

/**
 * Check if file exists in Object Storage
 * @param storageKey Storage key to check
 * @returns Exists boolean
 */
export async function storageExists(storageKey: string): Promise<boolean> {
  try {
    await client.downloadAsBytes(storageKey);
    return true;
  } catch (error: unknown) {
    return false;
  }
}