# Multi-stage Dockerfile for production deployment with autoscaling support

# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Production stage
FROM node:18-alpine AS production

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create app user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S valvechain -u 1001

# Set working directory
WORKDIR /app

# Copy built application
COPY --chown=valvechain:nodejs --from=builder /app/node_modules ./node_modules
COPY --chown=valvechain:nodejs . .

# Remove unnecessary files
RUN rm -rf .git .github docs *.md

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) }).on('error', () => process.exit(1))"

# Expose port
EXPOSE 3000

# Switch to non-root user
USER valvechain

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "index.js"]

# Labels for autoscaling and monitoring
LABEL maintainer="ValveChain Team"
LABEL app.name="valvechain-api"
LABEL app.version="1.0.0"
LABEL app.component="backend"
LABEL app.part-of="valvechain"
LABEL app.managed-by="kubernetes"

# Environment variables for autoscaling
ENV NODE_ENV=production
ENV PORT=3000
ENV METRICS_ENABLED=true
ENV HEALTH_CHECK_ENABLED=true

# Autoscaling environment variables
ENV CPU_SCALE_UP_THRESHOLD=70
ENV CPU_SCALE_DOWN_THRESHOLD=30
ENV RPS_SCALE_UP_THRESHOLD=100
ENV RPS_SCALE_DOWN_THRESHOLD=20
ENV MIN_INSTANCES=1
ENV MAX_INSTANCES=10

# Rate limiting environment variables
ENV GLOBAL_RATE_MAX=1000
ENV AUTH_RATE_MAX=5
ENV REDIS_ENABLED=false

# Circuit breaker environment variables
ENV CB_TIMEOUT=3000
ENV CB_ERROR_THRESHOLD=50
ENV CB_RESET_TIMEOUT=30000