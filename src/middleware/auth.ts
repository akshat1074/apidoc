import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errorHandler';

// For now, we'll use a simple API key approach
// In production, you'd use JWT tokens or OAuth

export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  const apiKey = req.headers['x-api-key'];
  
  // For demo purposes - in production, store these in database
  const validApiKeys = process.env.VALID_API_KEYS?.split(',') || ['demo-key-123'];
  
  if (!apiKey) {
    throw new AppError('API key is required. Please provide X-API-Key header.', 401);
  }
  
  if (!validApiKeys.includes(apiKey as string)) {
    throw new AppError('Invalid API key', 403);
  }
  
  next();
};

// Optional authentication - allows both authenticated and public access
export const optionalAuth = (req: Request, res: Response, next: NextFunction) => {
  const apiKey = req.headers['x-api-key'];
  
  if (apiKey) {
    const validApiKeys = process.env.VALID_API_KEYS?.split(',') || ['demo-key-123'];
    if (validApiKeys.includes(apiKey as string)) {
      // @ts-ignore - add authenticated flag to request
      req.authenticated = true;
    }
  }
  
  next();
};


