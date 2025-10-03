export const monitor = (label: string, data?: unknown) => {
  if (process.env.ENABLE_MONITOR === "true" || process.env.NODE_ENV !== "production") {
    console.log(`✅ [MONITOR] ${label}`, data || "");
  }
};

// Structured event monitoring for JSON logging
export const monitorEvent = (event: string, payload: any) => {
  if (process.env.ENABLE_MONITOR === "true" || process.env.NODE_ENV !== "production") {
    console.log(JSON.stringify({
      ts: new Date().toISOString(),
      event,
      payload,
    }));
  }
};