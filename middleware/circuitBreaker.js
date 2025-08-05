/**
 * Circuit Breaker Middleware
 * Implements circuit breaker pattern to protect against cascading failures
 */

const CircuitBreaker = require('opossum');
const config = require('../config/scalingConfig');

class CircuitBreakerManager {
  constructor() {
    this.breakers = new Map();
    this.fallbackCache = new Map();
    this.initializeBreakers();
  }

  /**
   * Initialize circuit breakers for different services
   */
  initializeBreakers() {
    // Create circuit breakers for each service
    Object.keys(config.circuitBreaker.services).forEach(serviceName => {
      this.createBreaker(serviceName, config.circuitBreaker.services[serviceName]);
    });

    console.log(`Initialized ${this.breakers.size} circuit breakers`);
  }

  /**
   * Create a circuit breaker for a specific service
   */
  createBreaker(serviceName, serviceConfig = {}) {
    const breakerConfig = {
      ...config.circuitBreaker.default,
      ...serviceConfig,
      name: serviceName,
    };

    const breaker = new CircuitBreaker(this.createServiceWrapper(serviceName), breakerConfig);

    // Event listeners for monitoring
    breaker.on('open', () => {
      console.warn(`Circuit breaker OPENED for ${serviceName}`);
    });

    breaker.on('halfOpen', () => {
      console.info(`Circuit breaker HALF-OPEN for ${serviceName}`);
    });

    breaker.on('close', () => {
      console.info(`Circuit breaker CLOSED for ${serviceName}`);
    });

    breaker.on('fallback', (result) => {
      console.warn(`Circuit breaker FALLBACK executed for ${serviceName}`);
    });

    // Set up fallback if configured
    const fallbackConfig = config.circuitBreaker.fallbacks[serviceName];
    if (fallbackConfig && fallbackConfig.enabled) {
      breaker.fallback(this.createFallbackHandler(serviceName, fallbackConfig));
    }

    this.breakers.set(serviceName, breaker);
    return breaker;
  }

  /**
   * Create a service wrapper function
   */
  createServiceWrapper(serviceName) {
    return async (operation, ...args) => {
      // This is where the actual service call would be made
      // The operation parameter contains the function to execute
      if (typeof operation === 'function') {
        return await operation(...args);
      }
      throw new Error(`Invalid operation for service ${serviceName}`);
    };
  }

  /**
   * Create fallback handler based on strategy
   */
  createFallbackHandler(serviceName, fallbackConfig) {
    return async (error, ...args) => {
      console.warn(`Executing fallback for ${serviceName}:`, error.message);

      switch (fallbackConfig.strategy) {
        case 'cache':
          return this.getCachedResult(serviceName, args);
        
        case 'default':
          return this.getDefaultResult(serviceName);
        
        case 'mock':
          return this.getMockResult(serviceName);
        
        case 'queue':
          return this.queueOperation(serviceName, args);
        
        default:
          throw new Error(`Fallback strategy not implemented: ${fallbackConfig.strategy}`);
      }
    };
  }

  /**
   * Get cached result for fallback
   */
  getCachedResult(serviceName, args) {
    const cacheKey = `${serviceName}:${JSON.stringify(args)}`;
    const cached = this.fallbackCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < config.circuitBreaker.fallbacks[serviceName].cacheTtl) {
      return cached.data;
    }
    
    return this.getDefaultResult(serviceName);
  }

  /**
   * Cache result for future fallback use
   */
  cacheResult(serviceName, args, result) {
    const cacheKey = `${serviceName}:${JSON.stringify(args)}`;
    this.fallbackCache.set(cacheKey, {
      data: result,
      timestamp: Date.now(),
    });
  }

  /**
   * Get default result for fallback
   */
  getDefaultResult(serviceName) {
    switch (serviceName) {
      case 'database':
        return { error: 'Database temporarily unavailable', cached: true };
      
      case 'blockchain':
        return { 
          message: 'Blockchain service temporarily unavailable. Operation will be queued.',
          queued: true 
        };
      
      case 'email':
        return { 
          message: 'Email service temporarily unavailable. Message queued for delivery.',
          queued: true 
        };
      
      default:
        return { error: `${serviceName} service temporarily unavailable` };
    }
  }

  /**
   * Get mock result for fallback
   */
  getMockResult(serviceName) {
    switch (serviceName) {
      case 'blockchain':
        return {
          transactionId: `mock_${Date.now()}`,
          status: 'pending',
          message: 'Mock transaction created - blockchain service unavailable'
        };
      
      default:
        return { message: `Mock response for ${serviceName}` };
    }
  }

  /**
   * Queue operation for later execution
   */
  queueOperation(serviceName, args) {
    // In a real implementation, this would queue the operation in Redis or database
    console.log(`Queuing operation for ${serviceName}:`, args);
    return { 
      queued: true, 
      message: `Operation queued for ${serviceName}`,
      queueId: `queue_${Date.now()}` 
    };
  }

  /**
   * Middleware wrapper for database operations
   */
  databaseBreaker() {
    return (req, res, next) => {
      const breaker = this.breakers.get('database');
      if (!breaker) {
        return next();
      }

      // Store original database methods and wrap them
      const originalDbMethods = this.wrapDatabaseMethods(breaker);
      req.db = originalDbMethods;
      
      next();
    };
  }

  /**
   * Wrap database methods with circuit breaker
   */
  wrapDatabaseMethods(breaker) {
    const db = require('../database'); // Adjust path as needed
    
    return {
      query: async (sql, params) => {
        return breaker.fire(async () => {
          // Execute database query
          return new Promise((resolve, reject) => {
            db.all(sql, params, (err, rows) => {
              if (err) reject(err);
              else resolve(rows);
            });
          });
        });
      },
      
      get: async (sql, params) => {
        return breaker.fire(async () => {
          return new Promise((resolve, reject) => {
            db.get(sql, params, (err, row) => {
              if (err) reject(err);
              else resolve(row);
            });
          });
        });
      },
      
      run: async (sql, params) => {
        return breaker.fire(async () => {
          return new Promise((resolve, reject) => {
            db.run(sql, params, function(err) {
              if (err) reject(err);
              else resolve({ lastID: this.lastID, changes: this.changes });
            });
          });
        });
      }
    };
  }

  /**
   * Middleware wrapper for blockchain operations
   */
  blockchainBreaker() {
    return (req, res, next) => {
      const breaker = this.breakers.get('blockchain');
      if (!breaker) {
        return next();
      }

      // Add circuit breaker wrapped blockchain service to request
      req.blockchain = {
        call: async (method, params) => {
          return breaker.fire(async () => {
            const blockchainService = require('../blockchainService');
            return blockchainService[method](params);
          });
        }
      };
      
      next();
    };
  }

  /**
   * Middleware wrapper for email operations
   */
  emailBreaker() {
    return (req, res, next) => {
      const breaker = this.breakers.get('email');
      if (!breaker) {
        return next();
      }

      // Add circuit breaker wrapped email service to request
      req.email = {
        send: async (emailData) => {
          return breaker.fire(async () => {
            const emailUtils = require('../emailUtils');
            return emailUtils.sendEmail(emailData);
          });
        }
      };
      
      next();
    };
  }

  /**
   * General circuit breaker middleware for any async operation
   */
  wrapOperation(serviceName, operation) {
    const breaker = this.breakers.get(serviceName) || this.createBreaker(serviceName);
    
    return async (...args) => {
      try {
        const result = await breaker.fire(operation, ...args);
        // Cache successful results for fallback
        this.cacheResult(serviceName, args, result);
        return result;
      } catch (error) {
        // If circuit breaker is open, fallback has already been called
        throw error;
      }
    };
  }

  /**
   * Get circuit breaker statistics
   */
  getStats() {
    const stats = {};
    
    this.breakers.forEach((breaker, serviceName) => {
      stats[serviceName] = {
        name: breaker.name,
        state: breaker.opened ? 'OPEN' : breaker.halfOpen ? 'HALF-OPEN' : 'CLOSED',
        stats: breaker.stats,
        options: {
          timeout: breaker.options.timeout,
          errorThresholdPercentage: breaker.options.errorThresholdPercentage,
          resetTimeout: breaker.options.resetTimeout,
        }
      };
    });
    
    return {
      breakers: stats,
      cacheSize: this.fallbackCache.size,
      totalBreakers: this.breakers.size,
    };
  }

  /**
   * Reset a specific circuit breaker
   */
  resetBreaker(serviceName) {
    const breaker = this.breakers.get(serviceName);
    if (breaker) {
      breaker.close();
      return true;
    }
    return false;
  }

  /**
   * Reset all circuit breakers
   */
  resetAllBreakers() {
    this.breakers.forEach(breaker => breaker.close());
  }

  /**
   * Health check for all circuit breakers
   */
  healthCheck() {
    const health = {
      status: 'healthy',
      breakers: {},
      issues: []
    };

    this.breakers.forEach((breaker, serviceName) => {
      const isHealthy = !breaker.opened;
      health.breakers[serviceName] = {
        status: isHealthy ? 'healthy' : 'unhealthy',
        state: breaker.opened ? 'OPEN' : breaker.halfOpen ? 'HALF-OPEN' : 'CLOSED',
      };

      if (!isHealthy) {
        health.issues.push(`${serviceName} circuit breaker is open`);
        health.status = 'degraded';
      }
    });

    return health;
  }
}

// Create singleton instance
const circuitBreakerManager = new CircuitBreakerManager();

module.exports = circuitBreakerManager;