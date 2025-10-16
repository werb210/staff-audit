/**
 * Rate Limiting Middleware for Chat API
 * Prevents abuse and DoS attacks on public chat endpoints
 */

import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';

// Chat-specific rate limiting configuration
export const chatStartLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Maximum 10 chat sessions per IP per 15 minutes
  message: {
    success: false,
    error: 'Too many chat sessions created',
    details: 'Please wait before starting a new chat session'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  handler: (req: Request, res: Response) => {
    console.warn(`🚨 [RATE-LIMIT] Chat start blocked for IP: ${req.ip}`);
    res.status(429).json({
      success: false,
      error: 'Rate limit exceeded',
      details: 'Too many chat sessions created. Please wait before trying again.'
    });
  }
});

export const chatMessageLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // Maximum 30 messages per IP per minute
  message: {
    success: false,
    error: 'Too many messages sent',
    details: 'Please wait before sending more messages'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  handler: (req: Request, res: Response) => {
    console.warn(`🚨 [RATE-LIMIT] Chat message blocked for IP: ${req.ip}`);
    res.status(429).json({
      success: false,
      error: 'Rate limit exceeded',
      details: 'Too many messages sent. Please wait before sending more messages.'
    });
  }
});

export const chatHistoryLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 20, // Maximum 20 history requests per IP per minute
  message: {
    success: false,
    error: 'Too many history requests',
    details: 'Please wait before requesting chat history again'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  handler: (req: Request, res: Response) => {
    console.warn(`🚨 [RATE-LIMIT] Chat history blocked for IP: ${req.ip}`);
    res.status(429).json({
      success: false,
      error: 'Rate limit exceeded',
      details: 'Too many history requests. Please wait before trying again.'
    });
  }
});

export const leadsLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // Maximum 5 lead submissions per IP per hour
  message: {
    success: false,
    error: 'Too many lead submissions',
    details: 'Please wait before submitting another lead'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  handler: (req: Request, res: Response) => {
    console.warn(`🚨 [RATE-LIMIT] Lead submission blocked for IP: ${req.ip}`);
    res.status(429).json({
      success: false,
      error: 'Rate limit exceeded',
      details: 'Too many lead submissions. Please wait before submitting another lead.'
    });
  }
});

export const escalationLimiter = rateLimit({
  windowMs: 30 * 60 * 1000, // 30 minutes
  max: 3, // Maximum 3 escalations per IP per 30 minutes
  message: {
    success: false,
    error: 'Too many escalation requests',
    details: 'Please wait before requesting escalation again'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  handler: (req: Request, res: Response) => {
    console.warn(`🚨 [RATE-LIMIT] Escalation blocked for IP: ${req.ip}`);
    res.status(429).json({
      success: false,
      error: 'Rate limit exceeded',
      details: 'Too many escalation requests. Please wait before trying again.'
    });
  }
});

export const reportLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Maximum 5 reports per IP per 15 minutes
  message: {
    success: false,
    error: 'Too many reports submitted',
    details: 'Please wait before submitting another report'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  handler: (req: Request, res: Response) => {
    console.warn(`🚨 [RATE-LIMIT] Report blocked for IP: ${req.ip}`);
    res.status(429).json({
      success: false,
      error: 'Rate limit exceeded',
      details: 'Too many reports submitted. Please wait before trying again.'
    });
  }
});

export const dashboardLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60, // Maximum 60 dashboard requests per IP per minute
  message: {
    success: false,
    error: 'Too many dashboard requests',
    details: 'Please wait before accessing dashboard again'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  handler: (req: Request, res: Response) => {
    console.warn(`🚨 [RATE-LIMIT] Dashboard blocked for IP: ${req.ip}`);
    res.status(429).json({
      success: false,
      error: 'Rate limit exceeded',
      details: 'Too many dashboard requests. Please wait before trying again.'
    });
  }
});

export const generalLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // Maximum 100 general requests per IP per minute
  message: {
    success: false,
    error: 'Rate limit exceeded',
    details: 'Please wait before making more requests'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  handler: (req: Request, res: Response) => {
    console.warn(`🚨 [RATE-LIMIT] General blocked for IP: ${req.ip}`);
    res.status(429).json({
      success: false,
      error: 'Rate limit exceeded',
      details: 'Too many requests. Please wait before trying again.'
    });
  }
});