# Environment Variables Documentation

## Overview

This document describes all environment variables used by the ValveChain Backend API, with special focus on user database integration configuration.

## Required Variables

### User Authentication & Security

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `JWT_SECRET` | string | **required** | Secret key for JWT token signing. Use a strong random string (min 32 chars) |
| `JWT_EXPIRES_IN` | string | `24h` | JWT token expiration time (e.g., '24h', '7d', '30m') |
| `FRONTEND_URL` | string | `http://localhost:3001` | Frontend URL for password reset links and CORS |

### Database Configuration

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `DB_PATH` | string | `./users.db` | Path to SQLite database file |
| `NODE_ENV` | string | `development` | Environment mode (development/production/test) |

### Email Configuration (Password Reset)

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `EMAIL_HOST` | string | `smtp.gmail.com` | SMTP server hostname |
| `EMAIL_PORT` | number | `587` | SMTP server port |
| `EMAIL_SECURE` | boolean | `false` | Use TLS (true for port 465, false for 587) |
| `EMAIL_USER` | string | **required** | SMTP username/email |
| `EMAIL_PASS` | string | **required** | SMTP password/app password |
| `EMAIL_FROM` | string | `noreply@valvechain.com` | From email address |

## Optional Variables

### Rate Limiting

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `AUTH_RATE_LIMIT_WINDOW` | number | `900000` | Auth endpoints rate limit window (ms) |
| `AUTH_RATE_LIMIT_MAX` | number | `5` | Max auth requests per window |
| `GENERAL_RATE_LIMIT_WINDOW` | number | `900000` | General endpoints rate limit window (ms) |
| `GENERAL_RATE_LIMIT_MAX` | number | `100` | Max general requests per window |

### Password Reset

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `RESET_TOKEN_EXPIRY` | number | `3600000` | Password reset token expiry (ms, default 1 hour) |

### Application

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `PORT` | number | `3000` | HTTP server port |
| `LOG_LEVEL` | string | `info` | Logging level (error/warn/info/debug) |
| `ENABLE_METRICS` | boolean | `true` | Enable performance metrics |

### Development & Testing

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `ENABLE_TEST_TOKEN` | boolean | `true` | Enable test token generation endpoint |

## Environment-Specific Configurations

### Development Environment

```bash
NODE_ENV=development
JWT_SECRET=dev-secret-change-in-production
JWT_EXPIRES_IN=24h
FRONTEND_URL=http://localhost:3001
ENABLE_TEST_TOKEN=true
LOG_LEVEL=debug
```

### Production Environment

```bash
NODE_ENV=production
JWT_SECRET=your-super-secure-random-string-here
JWT_EXPIRES_IN=1h
FRONTEND_URL=https://your-frontend-domain.com
ENABLE_TEST_TOKEN=false
LOG_LEVEL=error
EMAIL_HOST=your-production-smtp.com
EMAIL_USER=noreply@yourdomain.com
EMAIL_PASS=secure-app-password
```

### Testing Environment

```bash
NODE_ENV=test
JWT_SECRET=test-secret
JWT_EXPIRES_IN=1h
DB_PATH=:memory:
ENABLE_TEST_TOKEN=true
LOG_LEVEL=warn
```

## User Database Integration Variables

### Critical for Frontend-Backend Coordination

1. **JWT_SECRET**: Must be consistent across all instances for token validation
2. **JWT_EXPIRES_IN**: Should match frontend token refresh logic
3. **FRONTEND_URL**: Required for CORS and password reset links
4. **DB_PATH**: Database location for user data persistence

### Email Integration Variables

Required for complete password reset functionality:

```bash
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-gmail@gmail.com
EMAIL_PASS=your-16-char-app-password
EMAIL_FROM=noreply@yourcompany.com
```

**Gmail Setup:**
1. Enable 2-factor authentication
2. Generate App Password: Account → Security → 2-Step Verification → App passwords
3. Use the 16-character app password (not your regular password)

## Security Considerations

### JWT_SECRET

- **Development**: Can use a simple string but change before production
- **Production**: Use `openssl rand -base64 32` or similar to generate
- **Length**: Minimum 32 characters recommended
- **Characters**: Use alphanumeric + symbols for maximum entropy

### Environment File Security

```bash
# Set proper permissions
chmod 600 .env

# Add to .gitignore
echo ".env" >> .gitignore

# Never commit .env to version control
```

### Production Security Checklist

- [ ] JWT_SECRET is strong and unique
- [ ] EMAIL credentials are secure
- [ ] FRONTEND_URL is set to production domain
- [ ] ENABLE_TEST_TOKEN is false
- [ ] LOG_LEVEL is set to 'error' or 'warn'
- [ ] Database file has proper permissions
- [ ] Rate limiting is properly configured

## Database Migration Variables

When switching database systems:

```bash
# SQLite (current)
DB_PATH=./users.db

# PostgreSQL (future)
DATABASE_URL=postgresql://user:pass@host:5432/dbname

# MySQL (future)
DATABASE_URL=mysql://user:pass@host:3306/dbname
```

## Troubleshooting

### Common Issues

1. **JWT Token Invalid**: Check JWT_SECRET consistency
2. **Password Reset Not Working**: Verify email configuration
3. **CORS Errors**: Ensure FRONTEND_URL matches frontend origin
4. **Database Locked**: Check file permissions and concurrent access
5. **Rate Limited**: Adjust rate limit windows and maximums

### Testing Variables

```bash
# Test email configuration
npm run test-email

# Test JWT configuration
npm run test-jwt

# Test database connection
npm run test-db
```

### Environment Validation

The application validates required environment variables on startup:

- JWT_SECRET must be present and non-empty
- EMAIL_USER and EMAIL_PASS required for password reset
- PORT must be a valid number
- Database path must be writable

## Migration Guide

### From Development to Production

1. Generate secure JWT_SECRET: `openssl rand -base64 32`
2. Set up production email service
3. Configure production frontend URL
4. Disable test features: `ENABLE_TEST_TOKEN=false`
5. Set appropriate log level: `LOG_LEVEL=error`
6. Test all user flows before deployment

### Environment Variable Updates

When updating environment variables:

1. Update `.env` file
2. Restart the application
3. Test authentication flows
4. Verify email functionality
5. Check logging output
6. Validate rate limiting

## Best Practices

1. **Use .env files** for environment-specific configuration
2. **Validate on startup** - fail fast if required variables missing
3. **Document defaults** - include in code comments
4. **Secure storage** - never commit secrets to version control
5. **Regular rotation** - change JWT_SECRET and email passwords regularly
6. **Monitor usage** - track rate limits and authentication metrics
7. **Environment parity** - keep dev/staging/prod environments similar

## Support

For environment configuration issues:

1. Check this documentation
2. Verify variable names and values
3. Test with minimal configuration
4. Check application logs for startup errors
5. Validate email/database connectivity separately