// server/middleware/body-parser-fix.js
import express from "express";

/**
 * Ensures Express correctly parses JSON and URL-encoded bodies
 * before route handlers. Also guards against undefined req.body
 * during JSON POSTs in Codespaces or proxy environments.
 */
export function applyBodyParserFix(app) {
  // Parse JSON bodies safely
  app.use((req, res, next) => {
    // Handle missing or malformed Content-Type headers gracefully
    const type = req.headers["content-type"] || "";
    if (type.includes("application/json")) {
      express.json({ limit: "10mb" })(req, res, next);
    } else if (type.includes("application/x-www-form-urlencoded")) {
      express.urlencoded({ extended: true, limit: "10mb" })(req, res, next);
    } else {
      next();
    }
  });

  // Defensive check to ensure req.body is always defined
  app.use((req, res, next) => {
    if (typeof req.body === "undefined") req.body = {};
    next();
  });

  console.log("✅ Body parser fix applied");
}
