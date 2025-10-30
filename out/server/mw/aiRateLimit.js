import rateLimit from "express-rate-limit";
export const aiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 120, // limit each IP to 120 requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        ok: false,
        error: "too_many_ai_requests",
        message: "Rate limit exceeded for AI endpoints"
    }
});
