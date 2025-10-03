import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

// Custom error classes
export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string = 'Validation failed') {
    super(message, 400);
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, 401);
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Insufficient permissions') {
    super(message, 403);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(message, 404);
  }
}

export class TenantIsolationError extends AppError {
  constructor(message: string = 'Access denied: tenant isolation violation') {
    super(message, 403);
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Resource conflict') {
    super(message, 409);
  }
}

// Async error handler wrapper
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Global error handler middleware
export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let err = { ...error };
  err.message = error.message;

  // Log error
  console.error(error);

  // Zod validation errors
  if (error instanceof ZodError) {
    const message = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
    err = new ValidationError(message);
  }

  // Mongoose bad ObjectId
  if (error.name === 'CastError') {
    const message = 'Resource not found';
    err = new NotFoundError(message);
  }

  // Mongoose duplicate key
  if (error.name === 'MongoError' && (error as any).code === 11000) {
    const message = 'Duplicate field value entered';
    err = new ConflictError(message);
  }

  // Mongoose validation error
  if (error.name === 'ValidationError') {
    const message = Object.values((error as any).errors).map((val: any) => val.message).join(', ');
    err = new ValidationError(message);
  }

  // Operational errors
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: err.message
    });
  }

  // Programming or unknown errors
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
};