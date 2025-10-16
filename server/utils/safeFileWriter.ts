import fs from "fs/promises";
import path from "path";

// Enhanced logging wrapper for safe file writing with verification and retry
export async function safeWriteFileAndVerify(filePath: string, fileBuffer: Buffer) {
  const MIN_FILE_SIZE = 100; // Reject files under 100 bytes
  const logPrefix = `[SAFE WRITE] ${path.basename(filePath)}`;
  const MAX_RETRIES = 3;
  const RETRY_DELAY = 100;

  // Ensure directory exists before write attempts
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });
  console.log(`${logPrefix} - Directory ensured: ${dir}`);

  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`${logPrefix} - Write attempt ${attempt}/${MAX_RETRIES}`);
      
      // Step 1: Write the file
      await fs.writeFile(filePath, fileBuffer);
      console.log(`${logPrefix} - File written on attempt ${attempt}`);

      // Step 2: Immediate verification - stat the file
      const stats = await fs.stat(filePath);
      console.log(`${logPrefix} - File size: ${stats.size} bytes`);

      // Step 3: Size validation
      if (stats.size === 0) {
        throw new Error(`CRITICAL: Zero-byte file detected after write`);
      }
      
      if (stats.size < MIN_FILE_SIZE) {
        console.error(`${logPrefix} - ❌ FILE TOO SMALL: ${stats.size} bytes - deleting...`);
        await fs.unlink(filePath);
        throw new Error(`File too small: ${stats.size} bytes (minimum: ${MIN_FILE_SIZE})`);
      }

      // Step 4: Read verification - ensure file is readable
      try {
        await fs.readFile(filePath, { encoding: null });
        console.log(`${logPrefix} - ✅ Read verification passed`);
      } catch (readError) {
        throw new Error(`File write succeeded but read verification failed: ${readError instanceof Error ? readError.message : 'Unknown read error'}`);
      }

      console.log(`${logPrefix} - ✅ Complete verification passed: ${stats.size} bytes`);
      return stats.size;
      
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.error(`${logPrefix} - ❌ ATTEMPT ${attempt} FAILED:`, lastError.message);
      
      // Clean up failed attempt
      try {
        await fs.unlink(filePath);
        console.log(`${logPrefix} - Cleanup completed for attempt ${attempt}`);
      } catch (cleanupError) {
        console.error(`${logPrefix} - Cleanup failed:`, cleanupError);
      }
      
      // Wait before retry (except on last attempt)
      if (attempt < MAX_RETRIES) {
        console.log(`${logPrefix} - Retrying in ${RETRY_DELAY}ms...`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      }
    }
  }

  // All attempts failed
  console.error(`${logPrefix} - 🚨 ALL ${MAX_RETRIES} ATTEMPTS FAILED`);
  throw new Error(`File write failed after ${MAX_RETRIES} attempts: ${lastError?.message || 'Unknown error'}`);
}

// Recovery alert system for write failures
export function enqueueRecoveryAlert(applicationId: string, fileName: string) {
  console.error(`🚨 [RECOVERY ALERT] Critical disk write failure:`, {
    applicationId,
    fileName,
    timestamp: new Date().toISOString(),
    action: 'MANUAL_RECOVERY_REQUIRED'
  });
  
  // TODO: Add to recovery queue or send notification
  // This can be integrated with existing alert systems
}