import fs from 'fs/promises';
import path from 'path';

/**
 * Ensure directory exists, create if it doesn't
 */
export async function ensureDir(dirPath: string): Promise<void> {
  try {
    await fs.access(dirPath);
  } catch {
    await fs.mkdir(dirPath, { recursive: true });
  }
}

/**
 * Sanitize filename for safe storage
 */
export function sanitize(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^_|_$/g, '')
    .toLowerCase();
}

/**
 * Get file stats safely
 */
export async function getFileStats(filePath: string): Promise<{ size: number; exists: boolean }> {
  try {
    const stats = await fs.stat(filePath);
    return { size: stats.size, exists: true };
  } catch {
    return { size: 0, exists: false };
  }
}