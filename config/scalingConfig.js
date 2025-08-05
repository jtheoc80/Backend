/**
 * Autoscaling and Throttling Configuration
 * Centralized configuration for backend scaling and rate limiting features
 */

const config = {
  // Autoscaling Configuration
  autoscaling: {
    // CPU-based scaling thresholds
    cpu: {
      scaleUpThreshold: parseFloat(process.env.CPU_SCALE_UP_THRESHOLD) || 70, // Scale up at 70% CPU
      scaleDownThreshold: parseFloat(process.env.CPU_SCALE_DOWN_THRESHOLD) || 30, // Scale down at 30% CPU
      evaluationPeriod: parseInt(process.env.CPU_EVALUATION_PERIOD) || 300, // 5 minutes in seconds
    },
    
    // RPS-based scaling thresholds
    rps: {
      scaleUpThreshold: parseInt(process.env.RPS_SCALE_UP_THRESHOLD) || 100, // Scale up at 100 RPS
      scaleDownThreshold: parseInt(process.env.RPS_SCALE_DOWN_THRESHOLD) || 20, // Scale down at 20 RPS
      evaluationPeriod: parseInt(process.env.RPS_EVALUATION_PERIOD) || 300, // 5 minutes in seconds
    },
    
    // Scaling limits
    minInstances: parseInt(process.env.MIN_INSTANCES) || 1,
    maxInstances: parseInt(process.env.MAX_INSTANCES) || 10,
    cooldownPeriod: parseInt(process.env.COOLDOWN_PERIOD) || 300, // 5 minutes in seconds
  },

  // Rate Limiting Configuration
  rateLimiting: {
    // Global rate limits
    global: {
      windowMs: parseInt(process.env.GLOBAL_RATE_WINDOW) || 15 * 60 * 1000, // 15 minutes
      max: parseInt(process.env.GLOBAL_RATE_MAX) || 1000, // Max 1000 requests per window
      message: 'Too many requests from this IP, please try again later.',
      standardHeaders: true,
      legacyHeaders: false,
    },
    
    // Authentication endpoints (stricter limits)
    auth: {
      windowMs: parseInt(process.env.AUTH_RATE_WINDOW) || 15 * 60 * 1000, // 15 minutes
      max: parseInt(process.env.AUTH_RATE_MAX) || 5, // Max 5 attempts per window
      message: 'Too many authentication attempts, please try again later.',
      skipSuccessfulRequests: true,
    },
    
    // API endpoints by tier
    tiers: {
      free: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100, // 100 requests per window
        message: 'Rate limit exceeded for free tier. Consider upgrading.',
      },
      premium: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 1000, // 1000 requests per window
        message: 'Rate limit exceeded for premium tier.',
      },
      enterprise: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 10000, // 10000 requests per window
        message: 'Rate limit exceeded for enterprise tier.',
      },
    },
    
    // Regional rate limiting
    regional: {
      enabled: process.env.REGIONAL_RATE_LIMITING === 'true',
      regions: {
        'us-east': {
          windowMs: 15 * 60 * 1000,
          max: 2000,
        },
        'us-west': {
          windowMs: 15 * 60 * 1000,
          max: 2000,
        },
        'eu': {
          windowMs: 15 * 60 * 1000,
          max: 1500,
        },
        'asia': {
          windowMs: 15 * 60 * 1000,
          max: 1000,
        },
      },
    },
    
    // Redis configuration for distributed rate limiting
    redis: {
      enabled: process.env.REDIS_ENABLED === 'true',
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT) || 6379,
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB) || 0,
      keyPrefix: process.env.REDIS_KEY_PREFIX || 'rl:',
    },
  },

  // Circuit Breaker Configuration
  circuitBreaker: {
    // Default circuit breaker settings
    default: {
      timeout: parseInt(process.env.CB_TIMEOUT) || 3000, // 3 seconds
      errorThresholdPercentage: parseInt(process.env.CB_ERROR_THRESHOLD) || 50, // 50% error rate
      resetTimeout: parseInt(process.env.CB_RESET_TIMEOUT) || 30000, // 30 seconds
      rollingCountTimeout: parseInt(process.env.CB_ROLLING_TIMEOUT) || 10000, // 10 seconds
      rollingCountBuckets: parseInt(process.env.CB_ROLLING_BUCKETS) || 10,
      capacity: parseInt(process.env.CB_CAPACITY) || 10,
    },
    
    // Service-specific circuit breaker settings
    services: {
      database: {
        timeout: 5000,
        errorThresholdPercentage: 30,
        resetTimeout: 60000,
      },
      blockchain: {
        timeout: 10000,
        errorThresholdPercentage: 60,
        resetTimeout: 120000,
      },
      email: {
        timeout: 8000,
        errorThresholdPercentage: 40,
        resetTimeout: 45000,
      },
    },
    
    // Fallback strategies
    fallbacks: {
      database: {
        enabled: true,
        strategy: 'cache', // 'cache', 'default', 'error'
        cacheTtl: 60000, // 1 minute
      },
      blockchain: {
        enabled: true,
        strategy: 'mock',
      },
      email: {
        enabled: true,
        strategy: 'queue',
      },
    },
  },

  // Monitoring Configuration
  monitoring: {
    // Metrics collection
    metrics: {
      enabled: process.env.METRICS_ENABLED !== 'false',
      endpoint: process.env.METRICS_ENDPOINT || '/metrics',
      collectDefaultMetrics: process.env.COLLECT_DEFAULT_METRICS !== 'false',
      prefix: process.env.METRICS_PREFIX || 'valvechain_',
    },
    
    // Health checks
    healthCheck: {
      enabled: process.env.HEALTH_CHECK_ENABLED !== 'false',
      endpoint: process.env.HEALTH_CHECK_ENDPOINT || '/health',
      timeout: parseInt(process.env.HEALTH_CHECK_TIMEOUT) || 5000,
    },
    
    // Performance monitoring
    performance: {
      slowRequestThreshold: parseInt(process.env.SLOW_REQUEST_THRESHOLD) || 1000, // 1 second
      enableRequestLogging: process.env.ENABLE_REQUEST_LOGGING !== 'false',
    },
  },

  // Environment-specific overrides
  environment: process.env.NODE_ENV || 'development',
  
  // Feature flags
  features: {
    advancedRateLimiting: process.env.ADVANCED_RATE_LIMITING !== 'false',
    circuitBreakers: process.env.CIRCUIT_BREAKERS !== 'false',
    metricsCollection: process.env.METRICS_COLLECTION !== 'false',
    regionalScaling: process.env.REGIONAL_SCALING === 'true',
  },
};

// Environment-specific adjustments
if (config.environment === 'production') {
  // Production settings - more conservative
  config.autoscaling.cpu.scaleUpThreshold = 60;
  config.autoscaling.cpu.scaleDownThreshold = 20;
  config.rateLimiting.auth.max = 3; // Stricter auth limits in production
} else if (config.environment === 'development') {
  // Development settings - more lenient
  config.rateLimiting.global.max = 10000;
  config.rateLimiting.auth.max = 20;
}

module.exports = config;