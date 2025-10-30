/**
 * Keep only supported, meaningful features. Remove unknown ones that trigger warnings.
 */
export function permissions(_req, res, next) {
    // Disable powerful features by default.
    res.setHeader("Permissions-Policy", [
        "accelerometer=()",
        "camera=()",
        "geolocation=()",
        "gyroscope=()",
        "magnetometer=()",
        "microphone=()",
        "payment=()",
        "usb=()",
        // Opt out of Topics API (Chrome)
        "browsing-topics=()",
        // Optional: autoplay muted streams in app if you need it, else keep empty
        "autoplay=()",
    ].join(", "));
    next();
}
