/**
 * Monitoring and Metrics Middleware
 * Collects performance metrics and provides health checks for autoscaling
 */

const client = require('prom-client');
const config = require('../config/scalingConfig');

class MonitoringManager {
  constructor() {
    this.metrics = {};
    this.startTime = Date.now();
    this.requestStats = {
      total: 0,
      rps: 0,
      lastRpsCalculation: Date.now(),
      rpsWindow: [],
    };
    
    this.initializeMetrics();
    this.startRpsCalculation();
  }

  /**
   * Initialize Prometheus metrics
   */
  initializeMetrics() {
    if (!config.monitoring.metrics.enabled) {
      return;
    }

    const prefix = config.monitoring.metrics.prefix;

    // Collect default metrics (CPU, memory, etc.)
    if (config.monitoring.metrics.collectDefaultMetrics) {
      client.collectDefaultMetrics({ prefix });
    }

    // HTTP request metrics
    this.metrics.httpRequestsTotal = new client.Counter({
      name: `${prefix}http_requests_total`,
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code', 'user_tier'],
    });

    this.metrics.httpRequestDuration = new client.Histogram({
      name: `${prefix}http_request_duration_seconds`,
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.1, 0.5, 1, 2, 5, 10],
    });

    // Rate limiting metrics
    this.metrics.rateLimitHits = new client.Counter({
      name: `${prefix}rate_limit_hits_total`,
      help: 'Total number of rate limit hits',
      labelNames: ['type', 'tier'],
    });

    // Circuit breaker metrics
    this.metrics.circuitBreakerState = new client.Gauge({
      name: `${prefix}circuit_breaker_state`,
      help: 'Circuit breaker state (0=closed, 1=half-open, 2=open)',
      labelNames: ['service'],
    });

    this.metrics.circuitBreakerFailures = new client.Counter({
      name: `${prefix}circuit_breaker_failures_total`,
      help: 'Total circuit breaker failures',
      labelNames: ['service'],
    });

    // Application metrics
    this.metrics.activeConnections = new client.Gauge({
      name: `${prefix}active_connections`,
      help: 'Number of active connections',
    });

    this.metrics.requestsPerSecond = new client.Gauge({
      name: `${prefix}requests_per_second`,
      help: 'Current requests per second',
    });

    this.metrics.responseTime = new client.Gauge({
      name: `${prefix}average_response_time_ms`,
      help: 'Average response time in milliseconds',
    });

    // Database metrics
    this.metrics.databaseConnections = new client.Gauge({
      name: `${prefix}database_connections`,
      help: 'Number of database connections',
    });

    this.metrics.databaseQueryDuration = new client.Histogram({
      name: `${prefix}database_query_duration_seconds`,
      help: 'Database query duration in seconds',
      buckets: [0.01, 0.05, 0.1, 0.5, 1, 5],
    });

    console.log('Prometheus metrics initialized');
  }

  /**
   * Start RPS calculation
   */
  startRpsCalculation() {
    setInterval(() => {
      this.calculateRPS();
    }, 1000); // Calculate every second
  }

  /**
   * Calculate requests per second
   */
  calculateRPS() {
    const now = Date.now();
    const windowSize = 60000; // 1 minute window
    
    // Remove old entries
    this.requestStats.rpsWindow = this.requestStats.rpsWindow.filter(
      timestamp => now - timestamp < windowSize
    );
    
    // Calculate RPS
    this.requestStats.rps = this.requestStats.rpsWindow.length / (windowSize / 1000);
    
    // Update Prometheus metric
    if (this.metrics.requestsPerSecond) {
      this.metrics.requestsPerSecond.set(this.requestStats.rps);
    }
  }

  /**
   * HTTP request tracking middleware
   */
  requestTracker() {
    const responseTimeTracker = new Map();

    return (req, res, next) => {
      const startTime = Date.now();
      const route = this.normalizeRoute(req.route?.path || req.path || 'unknown');
      
      // Track request start
      this.requestStats.total++;
      this.requestStats.rpsWindow.push(Date.now());
      
      // Track response
      res.on('finish', () => {
        const duration = Date.now() - startTime;
        const statusCode = res.statusCode;
        const method = req.method;
        const userTier = this.getUserTier(req);

        // Update Prometheus metrics
        if (this.metrics.httpRequestsTotal) {
          this.metrics.httpRequestsTotal
            .labels(method, route, statusCode, userTier)
            .inc();
        }

        if (this.metrics.httpRequestDuration) {
          this.metrics.httpRequestDuration
            .labels(method, route, statusCode)
            .observe(duration / 1000);
        }

        // Log slow requests
        if (duration > config.monitoring.performance.slowRequestThreshold) {
          console.warn(`Slow request detected: ${method} ${route} - ${duration}ms`);
        }

        // Update response time tracking
        this.updateResponseTimeAverage(duration);
      });

      next();
    };
  }

  /**
   * Normalize route for metrics
   */
  normalizeRoute(path) {
    // Replace dynamic segments with placeholders
    return path
      .replace(/\/\d+/g, '/:id')
      .replace(/\/[a-f0-9]{24}/g, '/:objectId')
      .replace(/\/[a-f0-9-]{36}/g, '/:uuid');
  }

  /**
   * Get user tier for metrics
   */
  getUserTier(req) {
    if (req.user && req.user.subscription) {
      return req.user.subscription.tier || 'free';
    }
    return req.headers['x-api-tier'] || 'free';
  }

  /**
   * Update average response time
   */
  updateResponseTimeAverage(duration) {
    if (!this.responseTimeData) {
      this.responseTimeData = { total: 0, count: 0, average: 0 };
    }

    this.responseTimeData.total += duration;
    this.responseTimeData.count++;
    this.responseTimeData.average = this.responseTimeData.total / this.responseTimeData.count;

    if (this.metrics.responseTime) {
      this.metrics.responseTime.set(this.responseTimeData.average);
    }
  }

  /**
   * Rate limit tracking
   */
  trackRateLimit(type, tier = 'unknown') {
    if (this.metrics.rateLimitHits) {
      this.metrics.rateLimitHits.labels(type, tier).inc();
    }
  }

  /**
   * Circuit breaker state tracking
   */
  updateCircuitBreakerState(service, state) {
    if (this.metrics.circuitBreakerState) {
      let stateValue = 0; // closed
      if (state === 'half-open') stateValue = 1;
      if (state === 'open') stateValue = 2;
      
      this.metrics.circuitBreakerState.labels(service).set(stateValue);
    }
  }

  /**
   * Circuit breaker failure tracking
   */
  trackCircuitBreakerFailure(service) {
    if (this.metrics.circuitBreakerFailures) {
      this.metrics.circuitBreakerFailures.labels(service).inc();
    }
  }

  /**
   * Database query tracking
   */
  trackDatabaseQuery(duration) {
    if (this.metrics.databaseQueryDuration) {
      this.metrics.databaseQueryDuration.observe(duration / 1000);
    }
  }

  /**
   * Health check endpoint
   */
  healthCheck() {
    const now = Date.now();
    const uptime = now - this.startTime;
    
    // Get system metrics
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    // Health status determination
    let status = 'healthy';
    const checks = [];

    // Also fix the variable declaration
    const memoryUsagePercent = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;
    const memoryThreshold = config.environment === 'development' ? 95 : 90;
    const memoryWarningThreshold = config.environment === 'development' ? 90 : 80;
    
    if (memoryUsagePercent > memoryThreshold) {
      status = 'unhealthy';
      checks.push('High memory usage detected');
    } else if (memoryUsagePercent > memoryWarningThreshold) {
      status = 'degraded';
      checks.push('Elevated memory usage');
    }

    // Response time check
    const avgResponseTime = this.responseTimeData?.average || 0;
    if (avgResponseTime > 5000) {
      status = 'unhealthy';
      checks.push('Very slow response times');
    } else if (avgResponseTime > 2000) {
      status = 'degraded';
      checks.push('Slow response times');
    }

    return {
      status,
      timestamp: new Date().toISOString(),
      uptime: Math.floor(uptime / 1000), // seconds
      checks,
      metrics: {
        requestsPerSecond: Math.round(this.requestStats.rps * 100) / 100,
        totalRequests: this.requestStats.total,
        averageResponseTime: Math.round(avgResponseTime),
        memoryUsage: {
          heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024), // MB
          heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024), // MB
          usagePercent: Math.round(memoryUsagePercent),
        },
        cpuUsage: {
          user: cpuUsage.user,
          system: cpuUsage.system,
        },
      },
    };
  }

  /**
   * Get autoscaling metrics
   */
  getAutoscalingMetrics() {
    const health = this.healthCheck();
    
    return {
      rps: this.requestStats.rps,
      averageResponseTime: this.responseTimeData?.average || 0,
      memoryUsagePercent: (process.memoryUsage().heapUsed / process.memoryUsage().heapTotal) * 100,
      cpuUsagePercent: this.getCPUUsagePercent(),
      activeConnections: this.getActiveConnections(),
      uptime: Date.now() - this.startTime,
      recommendations: this.getScalingRecommendations(),
    };
  }

  /**
   * Get CPU usage percentage (simplified)
   */
  getCPUUsagePercent() {
    // This is a simplified implementation
    // In production, use proper CPU monitoring
    const usage = process.cpuUsage();
    return (usage.user + usage.system) / 10000; // Rough estimate
  }

  /**
   * Get active connections count
   */
  getActiveConnections() {
    // This would typically be tracked by the HTTP server
    return this.requestStats.rpsWindow.length; // Rough estimate
  }

  /**
   * Get scaling recommendations based on current metrics
   */
  getScalingRecommendations() {
    const recommendations = [];
    const rps = this.requestStats.rps;
    const memoryUsage = (process.memoryUsage().heapUsed / process.memoryUsage().heapTotal) * 100;
    const avgResponseTime = this.responseTimeData?.average || 0;

    // RPS-based recommendations
    if (rps > config.autoscaling.rps.scaleUpThreshold) {
      recommendations.push({
        action: 'scale_up',
        reason: `RPS (${Math.round(rps)}) exceeds scale-up threshold (${config.autoscaling.rps.scaleUpThreshold})`,
        priority: 'high',
      });
    } else if (rps < config.autoscaling.rps.scaleDownThreshold) {
      recommendations.push({
        action: 'scale_down',
        reason: `RPS (${Math.round(rps)}) below scale-down threshold (${config.autoscaling.rps.scaleDownThreshold})`,
        priority: 'low',
      });
    }

    // Memory-based recommendations
    if (memoryUsage > 85) {
      recommendations.push({
        action: 'scale_up',
        reason: `Memory usage (${Math.round(memoryUsage)}%) is high`,
        priority: 'high',
      });
    }

    // Response time-based recommendations
    if (avgResponseTime > 2000) {
      recommendations.push({
        action: 'scale_up',
        reason: `Average response time (${Math.round(avgResponseTime)}ms) is slow`,
        priority: 'medium',
      });
    }

    return recommendations;
  }

  /**
   * Export metrics for Prometheus
   */
  async getMetrics() {
    if (!config.monitoring.metrics.enabled) {
      return 'Metrics collection disabled';
    }
    
    return client.register.metrics();
  }

  /**
   * Reset metrics
   */
  resetMetrics() {
    client.register.clear();
    this.initializeMetrics();
    this.requestStats = {
      total: 0,
      rps: 0,
      lastRpsCalculation: Date.now(),
      rpsWindow: [],
    };
  }
}

// Create singleton instance
const monitoringManager = new MonitoringManager();

module.exports = monitoringManager;