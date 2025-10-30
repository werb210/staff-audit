export function otpGuard(req, res, next) {
    try {
        // If you keep this, ensure it never calls next() more than once:
        // Example: do lightweight checks or just pass through.
        return next();
    }
    catch (e) {
        return res.status(500).json({ success: false, message: "OTP guard failed" });
    }
}
