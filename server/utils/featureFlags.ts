export const DISABLE_EXTERNAL = String(process.env.DISABLE_EXTERNAL_CALLS||"").toLowerCase()==="true";

export function shouldSkipExternalCall(): boolean {
  return DISABLE_EXTERNAL;
}

export function logExternalCallSkip(service: string): void {
  if (DISABLE_EXTERNAL) {
    console.log(`[SKIP] External call to ${service} disabled by DISABLE_EXTERNAL_CALLS=true`);
  }
}