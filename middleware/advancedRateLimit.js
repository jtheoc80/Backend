/**
 * Advanced Rate Limiting Middleware
 * Enhanced rate limiting with Redis support, tiered limits, and regional controls
 */

const rateLimit = require('express-rate-limit');
const config = require('../config/scalingConfig');

class AdvancedRateLimiter {
  constructor() {
    this.redis = null;
    this.initializeRedis();
  }

  /**
   * Initialize Redis connection if enabled
   */
  initializeRedis() {
    if (config.rateLimiting.redis.enabled) {
      try {
        const Redis = require('ioredis');
        this.redis = new Redis({
          host: config.rateLimiting.redis.host,
          port: config.rateLimiting.redis.port,
          password: config.rateLimiting.redis.password,
          db: config.rateLimiting.redis.db,
          retryDelayOnFailover: 100,
          enableReadyCheck: false,
          maxRetriesPerRequest: null,
        });

        this.redis.on('error', (err) => {
          console.warn('Redis rate limiter error:', err.message);
          // Fall back to memory store on Redis errors
        });

        console.log('Redis rate limiter initialized');
      } catch (error) {
        console.warn('Failed to initialize Redis for rate limiting:', error.message);
        this.redis = null;
      }
    }
  }

  /**
   * Create rate limiter store (Redis or memory fallback)
   */
  createStore() {
    // For now, use memory store. Redis store can be added later if needed
    return undefined; // Use default memory store
  }

  /**
   * Global rate limiter
   */
  globalLimiter() {
    return rateLimit({
      ...config.rateLimiting.global,
      store: this.createStore(),
      keyGenerator: (req) => {
        return req.ip || req.connection.remoteAddress || 'unknown';
      },
      handler: (req, res) => {
        console.warn(`Global rate limit exceeded for IP: ${req.ip}`);
        res.status(429).json({
          error: config.rateLimiting.global.message,
          retryAfter: Math.ceil(config.rateLimiting.global.windowMs / 1000)
        });
      },
    });
  }

  /**
   * Authentication rate limiter (stricter)
   */
  authLimiter() {
    return rateLimit({
      ...config.rateLimiting.auth,
      store: this.createStore(),
      keyGenerator: (req) => {
        return req.ip || req.connection.remoteAddress || 'unknown';
      },
      handler: (req, res) => {
        console.warn(`Auth rate limit exceeded for IP: ${req.ip}`);
        res.status(429).json({
          error: config.rateLimiting.auth.message,
          retryAfter: Math.ceil(config.rateLimiting.auth.windowMs / 1000)
        });
      },
    });
  }

  /**
   * Tiered rate limiter based on user type
   */
  tieredLimiter() {
    return (req, res, next) => {
      // Determine user tier from token or default to free
      let userTier = 'free';
      
      if (req.user && req.user.subscription) {
        userTier = req.user.subscription.tier || 'free';
      } else if (req.headers['x-api-tier']) {
        userTier = req.headers['x-api-tier'];
      }

      // Validate tier
      if (!config.rateLimiting.tiers[userTier]) {
        userTier = 'free';
      }

      const tierConfig = config.rateLimiting.tiers[userTier];
      
      const limiter = rateLimit({
        ...tierConfig,
        store: this.createStore(),
        keyGenerator: (req) => {
          const userId = req.user ? req.user.id : req.ip;
          return `${userTier}:${userId}`;
        },
        handler: (req, res) => {
          console.warn(`Tier ${userTier} rate limit exceeded for user: ${req.user ? req.user.id : req.ip}`);
          res.status(429).json({
            error: tierConfig.message,
            tier: userTier,
            retryAfter: Math.ceil(tierConfig.windowMs / 1000)
          });
        },
      });

      limiter(req, res, next);
    };
  }

  /**
   * Regional rate limiter
   */
  regionalLimiter() {
    if (!config.rateLimiting.regional.enabled) {
      return (req, res, next) => next(); // Pass through if disabled
    }

    return (req, res, next) => {
      // Determine region from headers or IP geolocation (simplified)
      let region = req.headers['x-region'] || this.detectRegionFromIP(req.ip) || 'default';
      
      const regionConfig = config.rateLimiting.regional.regions[region] || 
                          config.rateLimiting.regional.regions['us-east']; // Default fallback

      const limiter = rateLimit({
        ...regionConfig,
        store: this.createStore(),
        keyGenerator: (req) => {
          return `region:${region}:${req.ip}`;
        },
        handler: (req, res) => {
          console.warn(`Regional rate limit exceeded for region ${region}, IP: ${req.ip}`);
          res.status(429).json({
            error: `Rate limit exceeded for region ${region}`,
            region: region,
            retryAfter: Math.ceil(regionConfig.windowMs / 1000)
          });
        },
      });

      limiter(req, res, next);
    };
  }

  /**
   * Detect region from IP (simplified implementation)
   * In production, use a proper IP geolocation service
   */
  detectRegionFromIP(ip) {
    // Simplified region detection - in production use GeoIP database
    if (!ip || ip === '127.0.0.1' || ip === '::1') {
      return 'us-east'; // Default for localhost
    }
    
    // Basic IP range detection (this is very simplified)
    const ipParts = ip.split('.');
    if (ipParts.length === 4) {
      const firstOctet = parseInt(ipParts[0]);
      if (firstOctet >= 1 && firstOctet <= 63) return 'us-east';
      if (firstOctet >= 64 && firstOctet <= 127) return 'us-west';
      if (firstOctet >= 128 && firstOctet <= 191) return 'eu';
      if (firstOctet >= 192 && firstOctet <= 223) return 'asia';
    }
    
    return 'us-east'; // Default fallback
  }

  /**
   * Slow down middleware for gradual throttling
   */
  slowDown() {
    const slowDown = require('express-slow-down');
    
    return slowDown({
      windowMs: 15 * 60 * 1000, // 15 minutes
      delayAfter: Math.floor(config.rateLimiting.global.max * 0.8), // Start slowing down at 80% of limit
      delayMs: () => 500, // Add 500ms delay per request after delayAfter
      maxDelayMs: 10000, // Maximum delay of 10 seconds
      store: this.createStore(),
      keyGenerator: (req) => {
        return req.ip || req.connection.remoteAddress || 'unknown';
      },
      validate: {
        delayMs: false // Disable the warning
      }
    });
  }

  /**
   * Custom rate limiter for specific endpoints
   */
  customLimiter(windowMs, max, message = 'Rate limit exceeded') {
    return rateLimit({
      windowMs,
      max,
      message,
      store: this.createStore(),
      standardHeaders: true,
      legacyHeaders: false,
      keyGenerator: (req) => {
        return req.ip || req.connection.remoteAddress || 'unknown';
      },
    });
  }

  /**
   * Rate limiter with burst allowance
   */
  burstLimiter(normalMax, burstMax, burstWindow = 60000) {
    return (req, res, next) => {
      const now = Date.now();
      const key = req.ip || req.connection.remoteAddress || 'unknown';
      
      // This is a simplified implementation
      // In production, use Redis with proper sliding window logic
      if (!this.burstCache) {
        this.burstCache = new Map();
      }

      const userStats = this.burstCache.get(key) || { requests: 0, burstStart: now, normalStart: now };
      
      // Reset burst window if expired
      if (now - userStats.burstStart > burstWindow) {
        userStats.requests = 0;
        userStats.burstStart = now;
      }

      // Reset normal window if expired (15 minutes)
      if (now - userStats.normalStart > 15 * 60 * 1000) {
        userStats.normalRequests = 0;
        userStats.normalStart = now;
      }

      userStats.requests++;
      userStats.normalRequests = (userStats.normalRequests || 0) + 1;

      this.burstCache.set(key, userStats);

      // Check burst limit
      if (userStats.requests > burstMax) {
        return res.status(429).json({
          error: 'Burst rate limit exceeded',
          retryAfter: Math.ceil((burstWindow - (now - userStats.burstStart)) / 1000)
        });
      }

      // Check normal limit
      if (userStats.normalRequests > normalMax) {
        return res.status(429).json({
          error: 'Rate limit exceeded',
          retryAfter: Math.ceil((15 * 60 * 1000 - (now - userStats.normalStart)) / 1000)
        });
      }

      next();
    };
  }

  /**
   * Get rate limiting statistics
   */
  getStats() {
    return {
      redisEnabled: !!this.redis,
      redisConnected: this.redis ? this.redis.status === 'ready' : false,
      config: {
        global: config.rateLimiting.global,
        auth: config.rateLimiting.auth,
        tiers: Object.keys(config.rateLimiting.tiers),
        regionalEnabled: config.rateLimiting.regional.enabled,
      }
    };
  }
}

// Create singleton instance
const rateLimiter = new AdvancedRateLimiter();

module.exports = rateLimiter;