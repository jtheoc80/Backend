# Backend Autoscaling and Throttling Implementation

This document provides comprehensive documentation for the backend autoscaling and throttling features implemented in the ValveChain API.

## Overview

The implementation includes three main components:

1. **Advanced Rate Limiting** - Sophisticated request throttling with tiered limits, regional controls, and Redis support
2. **Circuit Breakers** - Protection against cascading failures with service-specific fallback strategies
3. **Autoscaling Integration** - Metrics collection and configuration for container/serverless autoscaling

## Features

### ✅ Implemented Features

- **CPU and RPS-based autoscaling configuration**
- **Multi-tier rate limiting** (free, premium, enterprise)
- **Regional rate limiting** with IP-based region detection
- **Circuit breakers** for database, blockchain, and email services
- **Prometheus metrics** collection and export
- **Health checks** with autoscaling recommendations
- **Docker and Kubernetes** deployment configurations
- **Graceful degradation** and fallback mechanisms
- **Comprehensive monitoring** and alerting

### 🔧 Configuration Options

All features are configurable through environment variables and the central configuration system.

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Load Balancer │────│   Rate Limiter   │────│  Circuit Breaker│
│                 │    │                  │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │                        │
                                ▼                        ▼
                       ┌──────────────────┐    ┌─────────────────┐
                       │   API Gateway    │────│   Monitoring    │
                       │                  │    │   & Metrics     │
                       └──────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌──────────────────┐
                       │   Application    │
                       │   Services       │
                       └──────────────────┘
```

## Configuration

### Environment Variables

#### Autoscaling Configuration
```bash
# CPU-based scaling
CPU_SCALE_UP_THRESHOLD=70        # Scale up at 70% CPU
CPU_SCALE_DOWN_THRESHOLD=30      # Scale down at 30% CPU
CPU_EVALUATION_PERIOD=300        # 5 minutes evaluation period

# RPS-based scaling
RPS_SCALE_UP_THRESHOLD=100       # Scale up at 100 RPS
RPS_SCALE_DOWN_THRESHOLD=20      # Scale down at 20 RPS
RPS_EVALUATION_PERIOD=300        # 5 minutes evaluation period

# Instance limits
MIN_INSTANCES=1                  # Minimum instances
MAX_INSTANCES=10                 # Maximum instances
COOLDOWN_PERIOD=300              # 5 minutes cooldown
```

#### Rate Limiting Configuration
```bash
# Global rate limits
GLOBAL_RATE_WINDOW=900000        # 15 minutes in milliseconds
GLOBAL_RATE_MAX=1000             # Max requests per window
AUTH_RATE_WINDOW=900000          # 15 minutes for auth endpoints
AUTH_RATE_MAX=5                  # Max auth attempts per window

# Redis configuration (optional)
REDIS_ENABLED=true               # Enable Redis for distributed rate limiting
REDIS_HOST=localhost             # Redis host
REDIS_PORT=6379                  # Redis port
REDIS_PASSWORD=                  # Redis password (optional)
REDIS_DB=0                       # Redis database number

# Regional rate limiting
REGIONAL_RATE_LIMITING=false     # Enable regional limits
```

#### Circuit Breaker Configuration
```bash
CB_TIMEOUT=3000                  # Circuit breaker timeout (ms)
CB_ERROR_THRESHOLD=50            # Error threshold percentage
CB_RESET_TIMEOUT=30000           # Reset timeout (ms)
CB_ROLLING_TIMEOUT=10000         # Rolling window timeout (ms)
CB_ROLLING_BUCKETS=10            # Number of rolling buckets
CB_CAPACITY=10                   # Circuit breaker capacity
```

#### Monitoring Configuration
```bash
METRICS_ENABLED=true             # Enable Prometheus metrics
HEALTH_CHECK_ENABLED=true        # Enable health checks
METRICS_ENDPOINT=/metrics        # Metrics endpoint path
HEALTH_CHECK_ENDPOINT=/api/health # Health check endpoint path
SLOW_REQUEST_THRESHOLD=1000      # Slow request threshold (ms)
ENABLE_REQUEST_LOGGING=true      # Enable request logging
```

## API Endpoints

### System Endpoints

#### Health Check
```http
GET /api/health
```

Returns comprehensive health information including:
- Application status
- Memory and CPU usage
- Circuit breaker states
- Feature flags
- Performance metrics
- Autoscaling recommendations

Example response:
```json
{
  "status": "healthy",
  "timestamp": "2025-08-05T14:55:36.055Z",
  "uptime": 79,
  "checks": [],
  "metrics": {
    "requestsPerSecond": 45.2,
    "totalRequests": 1234,
    "averageResponseTime": 120,
    "memoryUsage": {
      "heapUsed": 128,
      "heapTotal": 256,
      "usagePercent": 50
    }
  },
  "circuitBreakers": {
    "database": { "status": "healthy", "state": "CLOSED" },
    "blockchain": { "status": "healthy", "state": "CLOSED" },
    "email": { "status": "healthy", "state": "CLOSED" }
  },
  "features": {
    "advancedRateLimiting": true,
    "circuitBreakers": true,
    "metricsCollection": true
  }
}
```

#### Prometheus Metrics
```http
GET /metrics
```

Returns Prometheus-formatted metrics for monitoring and autoscaling.

#### Autoscaling Metrics
```http
GET /api/autoscaling/metrics
```

Returns specific metrics for autoscaling decisions:
```json
{
  "rps": 45.2,
  "averageResponseTime": 120,
  "memoryUsagePercent": 75,
  "cpuUsagePercent": 60,
  "activeConnections": 150,
  "uptime": 3600000,
  "recommendations": [
    {
      "action": "scale_up",
      "reason": "RPS (45) exceeds scale-up threshold (40)",
      "priority": "high"
    }
  ]
}
```

#### Rate Limiting Statistics
```http
GET /api/rate-limit/stats
```

Returns rate limiting configuration and status.

#### Circuit Breaker Statistics
```http
GET /api/circuit-breaker/stats
```

Returns circuit breaker states and statistics.

## Rate Limiting

### Tiered Rate Limiting

The system supports three tiers of API access:

1. **Free Tier**: 100 requests per 15 minutes
2. **Premium Tier**: 1,000 requests per 15 minutes  
3. **Enterprise Tier**: 10,000 requests per 15 minutes

Tier detection:
- From user subscription in JWT token
- From `X-API-Tier` header
- Defaults to free tier

### Regional Rate Limiting

When enabled, applies different limits based on detected regions:
- **US East/West**: 2,000 requests per 15 minutes
- **Europe**: 1,500 requests per 15 minutes
- **Asia**: 1,000 requests per 15 minutes

Region detection:
- From `X-Region` header
- From IP geolocation (simplified implementation)
- Defaults to US East

### Authentication Rate Limiting

Stricter limits for authentication endpoints:
- **Development**: 20 attempts per 15 minutes
- **Production**: 3 attempts per 15 minutes

## Circuit Breakers

### Supported Services

1. **Database Circuit Breaker**
   - Timeout: 5 seconds
   - Error threshold: 30%
   - Fallback: Cached responses or error messages

2. **Blockchain Circuit Breaker**
   - Timeout: 10 seconds
   - Error threshold: 60%
   - Fallback: Mock responses or queued operations

3. **Email Circuit Breaker**
   - Timeout: 8 seconds
   - Error threshold: 40%
   - Fallback: Queue emails for later delivery

### Circuit Breaker States

- **CLOSED**: Normal operation, requests pass through
- **OPEN**: Circuit is open, requests are blocked and fallback is executed
- **HALF-OPEN**: Testing if service has recovered

## Deployment

### Docker Deployment

Build and run with Docker:
```bash
# Build the image
docker build -t valvechain-api .

# Run with basic configuration
docker run -p 3000:3000 -e NODE_ENV=production valvechain-api

# Run with full configuration
docker-compose up -d
```

### Kubernetes Deployment

Deploy to Kubernetes:
```bash
# Apply all configurations
kubectl apply -f k8s/

# Or apply individually
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/autoscaling.yaml
kubectl apply -f k8s/monitoring.yaml
```

The Kubernetes configuration includes:
- **Horizontal Pod Autoscaler** (HPA) for CPU and RPS-based scaling
- **Vertical Pod Autoscaler** (VPA) for resource optimization
- **Pod Disruption Budget** for high availability
- **Service Monitor** for Prometheus integration
- **Network Policies** for security

### Autoscaling Configuration

#### Horizontal Pod Autoscaler (HPA)
- **CPU-based**: Scale up at 70% CPU utilization
- **Memory-based**: Scale up at 80% memory utilization
- **Custom metrics**: Scale based on requests per second
- **Min replicas**: 1
- **Max replicas**: 10

#### Vertical Pod Autoscaler (VPA)
- **Automatic resource adjustment** based on actual usage
- **Min resources**: 100m CPU, 128Mi memory
- **Max resources**: 2 CPU, 2Gi memory

## Monitoring and Metrics

### Prometheus Metrics

The application exports comprehensive metrics:

#### HTTP Metrics
- `valvechain_http_requests_total` - Total HTTP requests
- `valvechain_http_request_duration_seconds` - Request duration histogram
- `valvechain_requests_per_second` - Current RPS gauge
- `valvechain_average_response_time_ms` - Average response time

#### Rate Limiting Metrics
- `valvechain_rate_limit_hits_total` - Rate limit violations
- Separate tracking by tier and endpoint type

#### Circuit Breaker Metrics
- `valvechain_circuit_breaker_state` - Circuit breaker states
- `valvechain_circuit_breaker_failures_total` - Failure counts

#### System Metrics
- `valvechain_active_connections` - Active connections
- `valvechain_database_connections` - Database connections
- `valvechain_database_query_duration_seconds` - Database query times

### Health Checks

Health checks are performed at multiple levels:
- **Liveness probe**: Basic application health
- **Readiness probe**: Ready to serve traffic
- **Custom health endpoint**: Comprehensive system status

### Alerting

Configure alerts based on metrics:
- High error rates
- Circuit breakers opening
- Rate limit violations
- Resource exhaustion
- Slow response times

## Best Practices

### Security
- Rate limiting prevents abuse and DoS attacks
- Circuit breakers protect against cascade failures
- Proper error handling prevents information leakage
- Network policies restrict traffic flow

### Performance
- Connection pooling for database connections
- Caching for frequently accessed data
- Compression for reduced bandwidth
- Efficient logging and monitoring

### Scalability
- Stateless application design
- Horizontal scaling support
- Resource-based autoscaling
- Load balancing across instances

### Reliability
- Graceful degradation under load
- Circuit breakers for external dependencies
- Health checks for service discovery
- Proper error handling and logging

## Troubleshooting

### Common Issues

#### High Memory Usage
- Check for memory leaks in application code
- Verify garbage collection settings
- Monitor object retention

#### Rate Limit Violations
- Review rate limiting configuration
- Check client behavior patterns
- Consider increasing limits for legitimate traffic

#### Circuit Breaker Activations
- Investigate underlying service issues
- Review error thresholds and timeouts
- Check fallback mechanisms

#### Slow Response Times
- Profile application performance
- Review database query performance
- Check network latency

### Debugging

#### Enable Debug Logging
```bash
NODE_ENV=development
ENABLE_REQUEST_LOGGING=true
```

#### Monitor Metrics
```bash
# Check current metrics
curl http://localhost:3000/metrics

# Check health status
curl http://localhost:3000/api/health

# Check autoscaling metrics
curl http://localhost:3000/api/autoscaling/metrics
```

#### Review Circuit Breaker Status
```bash
curl http://localhost:3000/api/circuit-breaker/stats
```

## Configuration Reference

### Complete Environment Variable List

```bash
# Application Settings
NODE_ENV=production
PORT=3000
JWT_SECRET=your-secret-key

# Autoscaling Settings
CPU_SCALE_UP_THRESHOLD=70
CPU_SCALE_DOWN_THRESHOLD=30
RPS_SCALE_UP_THRESHOLD=100
RPS_SCALE_DOWN_THRESHOLD=20
MIN_INSTANCES=1
MAX_INSTANCES=10
COOLDOWN_PERIOD=300

# Rate Limiting Settings
GLOBAL_RATE_MAX=1000
AUTH_RATE_MAX=5
REDIS_ENABLED=false
REDIS_HOST=localhost
REDIS_PORT=6379
REGIONAL_RATE_LIMITING=false

# Circuit Breaker Settings
CIRCUIT_BREAKERS=true
CB_TIMEOUT=3000
CB_ERROR_THRESHOLD=50
CB_RESET_TIMEOUT=30000

# Monitoring Settings
METRICS_ENABLED=true
HEALTH_CHECK_ENABLED=true
SLOW_REQUEST_THRESHOLD=1000
ENABLE_REQUEST_LOGGING=true

# Feature Flags
ADVANCED_RATE_LIMITING=true
METRICS_COLLECTION=true
REGIONAL_SCALING=false
```

## Support and Maintenance

### Regular Maintenance Tasks
- Monitor system metrics and performance
- Review and adjust rate limiting thresholds
- Update circuit breaker configurations
- Analyze autoscaling patterns
- Review security logs for abuse patterns

### Performance Tuning
- Adjust rate limiting based on usage patterns
- Optimize circuit breaker thresholds
- Fine-tune autoscaling parameters
- Update resource limits based on actual usage

### Scaling Considerations
- Plan for traffic growth
- Consider regional deployments
- Implement proper monitoring and alerting
- Regular load testing and capacity planning