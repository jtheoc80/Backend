# Database Integration for Audit Logs

This implementation adds PostgreSQL database integration for the audit logging system.

## Components Added

### 1. Database Connection (`database.js`)
- PostgreSQL connection pool using the `pg` library
- Environment-based configuration
- Graceful shutdown handling

### 2. Middleware (`middleware.js`)
- `checkAdmin` middleware for authentication and authorization
- Database connection export for use in routes
- JWT token validation

### 3. Database Schema (`initDb.js`)
- Creates `audit_logs` table with proper schema
- Adds indexes for query performance
- Can be run independently to initialize the database

### 4. Audit Logging (`logActivity.js`)
- Function to insert audit log entries
- Error handling for failed log attempts
- JSON metadata storage

### 5. API Routes (`auditLogsRoute.js`)
- GET `/audit_logs` endpoint with pagination and filtering
- Admin authentication required
- Supports filtering by user, action, and date range

## Environment Variables

Add these to your `.env` file:

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=backend_db
DB_USER=postgres
DB_PASSWORD=password

# JWT Secret for authentication
JWT_SECRET=your-jwt-secret-key-change-in-production
```

## Database Setup

1. Install PostgreSQL
2. Create a database (e.g., `backend_db`)
3. Run the initialization script:
   ```bash
   node initDb.js
   ```

## Usage

### Logging Activities
```javascript
const logActivity = require('./logActivity');
const db = require('./database');

await logActivity(db, 'user-123', 'login', { ip: '192.168.1.1' }, 'success');
```

### Querying Audit Logs
```javascript
// Use the API endpoint
GET /api/audit_logs?page=1&limit=10&user=user-123&action=login
Authorization: Bearer <admin-jwt-token>
```

## Testing

Run the test suite:
```bash
# Test database integration with mock database
node testMockDb.js

# Test API integration
node testApiIntegration.js
```

## Dependencies Added

- `pg`: PostgreSQL client
- `dotenv`: Environment variable management
- `jsonwebtoken`: JWT token handling (already existed)
- `express`: Web framework (already existed)

## Security Notes

- Admin authentication required for accessing audit logs
- JWT tokens must include `role: 'admin'` or `isAdmin: true`
- Database connections use connection pooling
- Environment variables should be secured in production