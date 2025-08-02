# Authentication System Documentation

## Overview
This authentication system provides complete user authentication functionality including user registration, login, password reset, email verification, and two-factor authentication (2FA).

## Features Implemented

### 🔐 Core Authentication
- User registration with email verification
- Secure login with JWT token generation
- Password reset via email tokens
- Two-factor authentication (TOTP/QR codes)

### 🛡️ Security Features
- Password hashing using bcrypt (strength: 12)
- Token expiry management (15 min for reset, 24h for verification)
- Rate limiting (5 attempts per 15 minutes)
- Input validation and sanitization
- Secure token generation using crypto.randomBytes

### 📧 Email Integration
- Nodemailer integration for sending emails
- Fallback to console logging when email is not configured
- Template-based email content for reset and verification

### 💾 Storage
- In-memory token storage with automatic cleanup
- User data storage with email verification status
- 2FA secret management

## API Endpoints

### User Registration
```
POST /auth/register
Body: { "email": "user@example.com", "password": "SecurePass123!" }
```

### User Login
```
POST /auth/login
Body: { "email": "user@example.com", "password": "SecurePass123!", "totpToken": "123456" }
```

### Password Reset
```
POST /auth/request_password_reset
Body: { "email": "user@example.com" }

POST /auth/reset_password
Body: { "token": "reset_token_here", "password": "NewSecurePass123!" }
```

### Email Verification
```
POST /auth/send_verification
Body: { "email": "user@example.com" }

POST /auth/verify_email
Body: { "token": "verification_token_here" }
```

### Two-Factor Authentication
```
POST /auth/setup_2fa
Body: { "email": "user@example.com" }

POST /auth/verify_2fa
Body: { "email": "user@example.com", "token": "123456" }
```

## Environment Variables

```
# Email Configuration (optional - will use mock emails if not set)
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# JWT Secret (optional - defaults to 'default-secret')
JWT_SECRET=your-jwt-secret

# Frontend URL for email links (optional)
FRONTEND_URL=http://localhost:3000
```

## Security Best Practices Implemented

1. **Rate Limiting**: 5 attempts per 15-minute window per IP
2. **Token Expiry**: Short-lived tokens (15 min for password reset)
3. **Password Hashing**: bcrypt with salt rounds of 12
4. **Input Validation**: Email format and password strength validation
5. **Secure Tokens**: Cryptographically secure random token generation
6. **No Information Disclosure**: Password reset doesn't reveal if email exists
7. **2FA Requirements**: Email must be verified before enabling 2FA

## Testing

Run the test server:
```bash
node testServer.js
```

Run the test suite:
```bash
node testAuth.js
```

## File Structure

- `authRoutes.js` - Main authentication routes and logic
- `userModel.js` - In-memory user and token storage
- `authMiddleware.js` - Rate limiting and validation middleware
- `emailUtils.js` - Email sending utility
- `testServer.js` - Test server for development
- `testAuth.js` - Comprehensive test suite