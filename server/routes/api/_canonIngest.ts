import crypto from 'crypto';
export function sha256(s: string) { return crypto.createHash('sha256').update(s).digest('hex'); }
export function parseCanon(input: any) {
  const version = input?.application_canon_version || 'v1';
  const canonObj = typeof input?.application_canon === 'string'
    ? JSON.parse(input.application_canon) : (input?.application_canon ?? {});
  const canonJson = JSON.stringify(canonObj);
  const fieldCount = Object.keys(canonObj || {}).length;
  return { version, canonObj, canonJson, fieldCount, hash: sha256(canonJson) };
}