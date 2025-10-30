export function recordConversion(label: string, value?: number) {
  console.log(`[Conversion] Recorded: ${label}`, value ?? "");
}
