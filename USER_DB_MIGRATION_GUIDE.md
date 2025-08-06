# User Database Migration and Troubleshooting Guide

## Overview

This guide covers migration procedures and troubleshooting steps for the user database schema coordination between the ValveChain Backend and Frontend.

## Migration Procedures

### Database Schema Migration

#### 1. Adding the is_active Column

If updating from an older version that doesn't have the `is_active` column:

```sql
-- Check if column exists
PRAGMA table_info(users);

-- Add column if it doesn't exist
ALTER TABLE users ADD COLUMN is_active INTEGER DEFAULT 1;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);
```

#### 2. Converting Boolean Values

If your database has BOOLEAN columns instead of INTEGER:

```sql
-- For SQLite
UPDATE users SET is_verified = CASE WHEN is_verified = 'true' OR is_verified = 1 THEN 1 ELSE 0 END;
UPDATE users SET is_active = CASE WHEN is_active = 'true' OR is_active = 1 THEN 1 ELSE 0 END;

-- For PostgreSQL
ALTER TABLE users ALTER COLUMN is_verified TYPE INTEGER USING CASE WHEN is_verified THEN 1 ELSE 0 END;
ALTER TABLE users ALTER COLUMN is_active TYPE INTEGER USING CASE WHEN is_active THEN 1 ELSE 0 END;

-- For MySQL
UPDATE users SET is_verified = CASE WHEN is_verified = TRUE THEN 1 ELSE 0 END;
UPDATE users SET is_active = CASE WHEN is_active = TRUE THEN 1 ELSE 0 END;
```

#### 3. Database Reset Procedures

##### Complete Database Reset (Development Only)

```bash
# Stop the application
npm stop

# Backup existing data (optional)
cp users.db users.db.backup

# Delete database file
rm users.db

# Restart application (will recreate tables)
npm start
```

##### Selective Data Reset

```sql
-- Reset all users (keep schema)
DELETE FROM users;
DELETE FROM audit_logs;

-- Reset auto-increment counter (SQLite)
DELETE FROM sqlite_sequence WHERE name='users';
```

##### Schema Reset with Data Preservation

```bash
# Backup data
sqlite3 users.db ".dump users" > users_backup.sql

# Drop and recreate tables
sqlite3 users.db "DROP TABLE IF EXISTS users;"

# Restart application to recreate schema
npm start

# Restore data
sqlite3 users.db < users_backup.sql
```

### Frontend-Backend Sync Migration

#### 1. API Response Format Updates

When updating from integer to boolean responses:

**Backend Changes:**
```javascript
// Before: Returns integer values
{
  id: 1,
  username: "john",
  is_verified: 0,
  is_active: 1
}

// After: Returns boolean values
{
  id: 1,
  username: "john",
  is_verified: false,
  is_active: true
}
```

**Frontend Migration:**
```typescript
// Update TypeScript interfaces
interface User {
  id: number;
  username: string;
  is_verified: boolean;  // Changed from number
  is_active: boolean;    // Changed from number
}

// Update existing code to handle both formats during migration
const isUserVerified = (user: any): boolean => {
  return typeof user.is_verified === 'boolean' ? user.is_verified : Boolean(user.is_verified);
};
```

## Troubleshooting Guide

### Common Issues

#### 1. Database Locked Error

**Symptoms:**
- `SQLITE_BUSY: database is locked`
- Application hangs on database operations

**Solutions:**
```bash
# Check for zombie processes
ps aux | grep node

# Kill any hanging processes
pkill -f node

# Check file permissions
ls -la users.db

# Fix permissions if needed
chmod 664 users.db
```

#### 2. Boolean Conversion Issues

**Symptoms:**
- Frontend receives integer values instead of booleans
- TypeScript type errors

**Diagnosis:**
```javascript
// Test API response format
const response = await fetch('/api/auth/profile');
const user = await response.json();
console.log('is_verified type:', typeof user.user.is_verified);
console.log('is_active type:', typeof user.user.is_active);
```

**Solution:**
```javascript
// Verify toJSON() method in userModel.js
toJSON() {
  return {
    ...userWithoutSensitiveData,
    is_verified: Boolean(userWithoutSensitiveData.is_verified),
    is_active: Boolean(userWithoutSensitiveData.is_active)
  };
}
```

#### 3. Authentication Token Issues

**Symptoms:**
- 401 errors on valid requests
- JWT token verification failures

**Diagnosis:**
```bash
# Check JWT_SECRET environment variable
echo $JWT_SECRET

# Test token generation
curl -X POST http://localhost:3000/api/auth/test-token \
  -H "Content-Type: application/json" \
  -d '{"role": "admin"}'
```

**Solution:**
```bash
# Set strong JWT secret
export JWT_SECRET="your-32-character-minimum-secret"

# Restart application
npm restart
```

#### 4. Migration Constraint Errors

**Symptoms:**
- `CONSTRAINT` errors during migration
- Foreign key violations

**Diagnosis:**
```sql
-- Check foreign key constraints
PRAGMA foreign_keys;
PRAGMA foreign_key_check;

-- Check table structure
.schema users
```

**Solution:**
```sql
-- Temporarily disable foreign keys
PRAGMA foreign_keys = OFF;

-- Run migration
-- ... migration commands ...

-- Re-enable foreign keys
PRAGMA foreign_keys = ON;
```

### Testing Procedures

#### 1. Database Schema Validation

```bash
# Run schema validation test
npm run test-db-schema

# Check all indexes exist
sqlite3 users.db ".indexes"

# Verify foreign keys
sqlite3 users.db "PRAGMA foreign_key_check;"
```

#### 2. API Response Format Testing

```bash
# Test boolean conversion
npm test -- __tests__/userIntegration.test.js

# Test specific boolean response
curl -X GET http://localhost:3000/api/auth/profile \
  -H "Authorization: Bearer YOUR_TOKEN" \
  | jq '.user.is_verified, .user.is_active'
```

#### 3. Frontend Integration Testing

```javascript
// Test API integration
const testBooleanFields = async () => {
  const response = await fetch('/api/auth/profile');
  const data = await response.json();
  
  console.assert(typeof data.user.is_verified === 'boolean', 'is_verified should be boolean');
  console.assert(typeof data.user.is_active === 'boolean', 'is_active should be boolean');
};
```

### Performance Optimization

#### 1. Index Optimization

```sql
-- Check index usage
EXPLAIN QUERY PLAN SELECT * FROM users WHERE email = 'test@example.com';

-- Add missing indexes
CREATE INDEX IF NOT EXISTS idx_users_email_active ON users(email, is_active);
```

#### 2. Database Size Management

```bash
# Check database size
ls -lh users.db

# Vacuum database to reclaim space
sqlite3 users.db "VACUUM;"

# Analyze query performance
sqlite3 users.db "ANALYZE;"
```

### Rollback Procedures

#### 1. Emergency Rollback

```bash
# Stop application
npm stop

# Restore from backup
cp users.db.backup users.db

# Restart with previous version
git checkout previous-stable-commit
npm start
```

#### 2. Selective Rollback

```sql
-- Rollback schema changes only
DROP INDEX IF EXISTS idx_users_is_active;
ALTER TABLE users DROP COLUMN is_active;
```

### Monitoring and Health Checks

#### 1. Database Health Check

```bash
#!/bin/bash
# health-check.sh

echo "Checking database connectivity..."
sqlite3 users.db "SELECT COUNT(*) FROM users;" || exit 1

echo "Checking schema integrity..."
sqlite3 users.db "PRAGMA integrity_check;" || exit 1

echo "Checking indexes..."
sqlite3 users.db "PRAGMA index_list(users);" || exit 1

echo "Database health check passed!"
```

#### 2. API Health Check

```bash
#!/bin/bash
# api-health-check.sh

echo "Testing user registration..."
curl -f -X POST http://localhost:3000/api/auth/test-token \
  -H "Content-Type: application/json" \
  -d '{"role": "user"}' > /tmp/token.json || exit 1

echo "Testing profile endpoint..."
TOKEN=$(jq -r '.token' /tmp/token.json)
curl -f -X GET http://localhost:3000/api/auth/profile \
  -H "Authorization: Bearer $TOKEN" > /tmp/profile.json || exit 1

echo "Checking boolean types..."
IS_VERIFIED_TYPE=$(jq -r 'type' /tmp/profile.json | jq '.user.is_verified | type')
IS_ACTIVE_TYPE=$(jq -r 'type' /tmp/profile.json | jq '.user.is_active | type')

[[ "$IS_VERIFIED_TYPE" == "boolean" ]] || { echo "is_verified is not boolean"; exit 1; }
[[ "$IS_ACTIVE_TYPE" == "boolean" ]] || { echo "is_active is not boolean"; exit 1; }

echo "API health check passed!"
```

### Documentation Updates

#### 1. Schema Documentation

After migration, update:
- `SCHEMA.md` with new column definitions
- `USER_API_CONTRACT.md` with response format changes
- `ENVIRONMENT_VARIABLES.md` with any new configuration

#### 2. Version Compatibility

Document version compatibility:

```markdown
## Version Compatibility

| Backend Version | Frontend Version | Database Schema | Notes |
|-----------------|------------------|-----------------|-------|
| v1.0.x          | v1.0.x          | v1              | Integer booleans |
| v1.1.x          | v1.1.x          | v2              | Boolean responses |
```

### Support Contacts

For migration issues:
- Database: Review `DATABASE_IMPLEMENTATION_SUMMARY.md`
- API: Review `USER_API_CONTRACT.md`
- Environment: Review `ENVIRONMENT_VARIABLES.md`
- General: Check application logs and test results

### Best Practices

1. **Always backup** before migration
2. **Test in development** first
3. **Monitor logs** during migration
4. **Validate data integrity** after migration
5. **Update documentation** after successful migration
6. **Communicate changes** to frontend team
7. **Plan rollback procedures** before starting