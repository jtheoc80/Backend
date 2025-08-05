# Setup and Usage Guide

## Quick Start

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Environment Configuration**
   Update `.env` file with your configuration:
   ```
   JWT_SECRET=your-very-secure-jwt-secret-key-here
   JWT_EXPIRES_IN=24h
   EMAIL_USER=your-email@example.com
   EMAIL_PASS=your-email-password
   FRONTEND_URL=http://localhost:3000
   PORT=3000
   ```

3. **Start the Server**
   ```bash
   npm start
   # or
   node index.js
   ```

## API Usage Examples

### Register Admin User
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "email": "admin@company.com",
    "password": "SecurePassword123!",
    "role": "admin"
  }'
```

### Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@company.com",
    "password": "SecurePassword123!"
  }'
```

### Get Profile (requires authentication)
```bash
curl -X GET http://localhost:3000/api/auth/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Generate Test Token (development/testing only)
```bash
# Generate test token for regular user
curl -X POST http://localhost:3000/api/auth/test-token \
  -H "Content-Type: application/json" \
  -d '{
    "role": "user",
    "userId": 999,
    "username": "testuser"
  }'

# Generate test token for admin user
curl -X POST http://localhost:3000/api/auth/test-token \
  -H "Content-Type: application/json" \
  -d '{
    "role": "admin",
    "userId": 1000,
    "username": "testadmin"
  }'
```

**Note**: Test token generation is automatically disabled in production environments.

### List Users (admin only)
```bash
curl -X GET http://localhost:3000/api/auth/users \
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN"
```

### View Audit Logs (admin only)
```bash
curl -X GET http://localhost:3000/api/audit_logs \
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN"
```

## Database

The application uses SQLite by default. The database file (`users.db`) will be created automatically on first run.

For production, you may want to switch to PostgreSQL or MySQL by modifying the `database.js` file.

## Security Notes

1. **JWT Secret**: Always use a strong, unique JWT secret in production
2. **Password Policy**: Implement appropriate password complexity requirements
3. **Rate Limiting**: The built-in rate limiting helps prevent abuse
4. **HTTPS**: Always use HTTPS in production
5. **Database Security**: Secure your database with proper credentials and network access controls

## Available Endpoints

- **Health**: `GET /api/health`
- **Authentication**: `/api/auth/*` (register, login, profile, etc.)
- **Admin**: User management and audit logs
- **ValveChain**: Blockchain operations (currently with placeholder responses)

## Troubleshooting

1. **Database Issues**: Delete `users.db` to reset the database
2. **Authentication Issues**: Check JWT_SECRET in environment variables
3. **Permission Issues**: Ensure the user has the correct role (admin/user)
4. **Email Issues**: Configure email settings in `.env` for password reset functionality