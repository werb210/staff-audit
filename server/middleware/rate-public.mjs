import rateLimit from "express-rate-limit";
export function ratePublic() {
  return rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false
  });
}