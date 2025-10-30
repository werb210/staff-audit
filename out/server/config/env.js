export const CONFIG = {
    API_MODE: process.env.API_MODE || "test", // ⬅ default to test mode
    LENDER_API_URL: process.env.API_MODE === "production"
        ? "https://prod.lender.api"
        : "https://sandbox.lender.api", // ⬅ sandbox endpoint for test mode
    ENABLE_MONITOR: true,
};
