const logger = require('./logger');

// Application metrics
class MetricsCollector {
    constructor() {
        this.metrics = {
            requests: {
                total: 0,
                success: 0,
                errors: 0,
                byEndpoint: {}
            },
            response_times: [],
            database: {
                connections: 0,
                queries: 0,
                errors: 0
            },
            memory: {
                peak_usage: 0,
                current_usage: 0
            }
        };
        
        // Start periodic metrics collection
        this.startMetricsCollection();
    }

    recordRequest(endpoint, method, statusCode, responseTime) {
        this.metrics.requests.total++;
        
        if (statusCode >= 200 && statusCode < 400) {
            this.metrics.requests.success++;
        } else {
            this.metrics.requests.errors++;
        }

        const key = `${method} ${endpoint}`;
        if (!this.metrics.requests.byEndpoint[key]) {
            this.metrics.requests.byEndpoint[key] = { count: 0, avgResponseTime: 0 };
        }
        
        const endpointMetrics = this.metrics.requests.byEndpoint[key];
        endpointMetrics.count++;
        endpointMetrics.avgResponseTime = 
            ((endpointMetrics.avgResponseTime * (endpointMetrics.count - 1)) + responseTime) / endpointMetrics.count;

        this.metrics.response_times.push(responseTime);
        
        // Keep only last 1000 response times
        if (this.metrics.response_times.length > 1000) {
            this.metrics.response_times = this.metrics.response_times.slice(-1000);
        }
    }

    recordDatabaseQuery(success = true) {
        this.metrics.database.queries++;
        if (!success) {
            this.metrics.database.errors++;
        }
    }

    getMetrics() {
        const memUsage = process.memoryUsage();
        this.metrics.memory.current_usage = memUsage.heapUsed;
        
        if (memUsage.heapUsed > this.metrics.memory.peak_usage) {
            this.metrics.memory.peak_usage = memUsage.heapUsed;
        }

        return {
            ...this.metrics,
            uptime: process.uptime(),
            timestamp: new Date().toISOString()
        };
    }

    startMetricsCollection() {
        // Log metrics every 6 hours
        setInterval(() => {
            const metrics = this.getMetrics();
            logger.info('Application metrics', { metrics });
        }, 6 * 60 * 60 * 1000);
    }
}

// Singleton instance
const metricsCollector = new MetricsCollector();

// Middleware for request metrics
const metricsMiddleware = (req, res, next) => {
    const start = Date.now();
    
    const originalEnd = res.end;
    res.end = function(...args) {
        const responseTime = Date.now() - start;
        metricsCollector.recordRequest(
            req.path || req.url,
            req.method,
            res.statusCode,
            responseTime
        );
        originalEnd.apply(this, args);
    };

    next();
};

// Health check endpoint with metrics
const healthCheckWithMetrics = (req, res) => {
    const metrics = metricsCollector.getMetrics();
    const health = {
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        service: 'ValveChain Sidecar API',
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        memory: process.memoryUsage(),
        metrics: {
            requests: metrics.requests,
            database: metrics.database,
            avgResponseTime: metrics.response_times.length > 0 
                ? metrics.response_times.reduce((a, b) => a + b, 0) / metrics.response_times.length
                : 0
        }
    };
    
    res.json(health);
};

module.exports = {
    MetricsCollector,
    metricsCollector,
    metricsMiddleware,
    healthCheckWithMetrics
};