import { v4 as uuidv4 } from 'uuid';
import logger from '../logger.js';

// Middleware to add request ID and log request/response information
export const requestLoggingMiddleware = (req, res, next) => {
  // Generate unique request ID
  req.id = uuidv4();
  
  // Start timing the request
  const startTime = Date.now();
  
  // Extract user information from headers or JWT token
  const userInfo = {
    userId: req.headers['x-user-id'] || 'anonymous',
    userAgent: req.headers['user-agent'],
    ip: req.ip || req.connection.remoteAddress,
  };
  
  // Log incoming request
  logger.info('Incoming request', {
    requestId: req.id,
    method: req.method,
    url: req.url,
    userInfo,
    headers: {
      contentType: req.headers['content-type'],
      authorization: req.headers.authorization ? 'Bearer [REDACTED]' : undefined,
    }
  });
  
  // Override res.end to capture response information
  const originalEnd = res.end;
  res.end = function(...args) {
    const responseTime = Date.now() - startTime;
    
    // Log response
    logger.info('Request completed', {
      requestId: req.id,
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      responseTime,
      userInfo
    });
    
    // Call original end method
    originalEnd.apply(this, args);
  };
  
  next();
};

// Error logging middleware
export const errorLoggingMiddleware = (err, req, res, next) => {
  logger.error('Request error', {
    requestId: req.id,
    method: req.method,
    url: req.url,
    error: {
      message: err.message,
      stack: err.stack,
      name: err.name
    },
    userInfo: {
      userId: req.headers['x-user-id'] || 'anonymous',
      ip: req.ip || req.connection.remoteAddress,
    }
  });
  
  next(err);
};