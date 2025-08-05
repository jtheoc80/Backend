import jwt from 'jsonwebtoken';
import UserModel from './userModel.js';

/**
 * Authentication Middleware - JWT-based authentication for protecting routes
 */
const authMiddleware = {
  // Verify JWT token and authenticate user
  authenticateToken: (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    jwt.verify(token, JWT_SECRET, async (err, decoded) => {
      if (err) {
        if (err.name === 'TokenExpiredError') {
          return res.status(401).json({ error: 'Token expired' });
        } else if (err.name === 'JsonWebTokenError') {
          return res.status(403).json({ error: 'Invalid token' });
        } else {
          return res.status(403).json({ error: 'Token verification failed' });
        }
      }

      // Verify user still exists and is active
      try {
        const user = await UserModel.findById(decoded.userId);
        if (!user) {
          return res.status(401).json({ error: 'User not found or inactive' });
        }

        // Add user info to request object
        req.user = {
          userId: decoded.userId,
          email: decoded.email,
          role: decoded.role
        };
        
        next();
      } catch (error) {
        console.error('Token verification error:', error);
        return res.status(500).json({ error: 'Authentication failed' });
      }
    });
  },

  // Middleware to check if user has admin role
  requireAdmin: (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
      next();
    } else {
      res.status(403).json({ error: 'Admin access required' });
    }
  },

  // Middleware to check if user has specific role
  requireRole: (role) => {
    return (req, res, next) => {
      if (req.user && req.user.role === role) {
        next();
      } else {
        res.status(403).json({ error: `${role} access required` });
      }
    };
  },

  // Optional authentication - continues if no token, but sets user if valid token
  optionalAuth: (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return next(); // Continue without authentication
    }

    jwt.verify(token, jwtSecret, async (err, decoded) => {
      if (err) {
        return next(); // Continue without authentication on token error
      }

      try {
        const user = await UserModel.findById(decoded.userId);
        if (user) {
          req.user = {
            userId: decoded.userId,
            email: decoded.email,
            role: decoded.role
          };
        }
      } catch (error) {
        console.error('Optional auth error:', error);
      }
      
      next();
    });
  },

  // Middleware to generate JWT token
  generateToken: (payload, options = {}) => {
    const defaultOptions = {
      expiresIn: '24h'
    };
    
    return jwt.sign(
      payload,
      JWT_SECRET,
      { ...defaultOptions, ...options }
    );
  },

  // Middleware to refresh token
  refreshToken: (req, res) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    jwt.verify(token, JWT_SECRET, async (err, decoded) => {
      if (err) {
        return res.status(403).json({ error: 'Invalid token' });
      }

      try {
        // Verify user still exists
        const user = await UserModel.findById(decoded.userId);
        if (!user) {
          return res.status(401).json({ error: 'User not found' });
        }

        // Generate new token
        const newToken = authMiddleware.generateToken({
          userId: user.id,
          email: user.email,
          role: user.role
        });

        res.json({ token: newToken });
      } catch (error) {
        console.error('Token refresh error:', error);
        res.status(500).json({ error: 'Token refresh failed' });
      }
    });
  }
};

export default authMiddleware;