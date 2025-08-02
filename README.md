# ValveChain Backend API

A Node.js backend API for ValveChain with PostgreSQL database integration, user management, and audit logging.

## Features

- **User Management**: Registration, login, authentication with JWT
- **Audit Logging**: Comprehensive logging of user activities
- **Database Integration**: PostgreSQL with connection pooling
- **Security**: JWT authentication, role-based access control, rate limiting
- **Admin Panel**: Audit log retrieval with filtering and pagination

## Prerequisites

- Node.js (v14 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Database Setup

Make sure PostgreSQL is running and create a database:

```sql
CREATE DATABASE valvechain_db;
```

### 3. Environment Configuration

Update the `.env` file with your database credentials:

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=valvechain_db
DB_USER=postgres
DB_PASSWORD=your_password

# JWT Secret
JWT_SECRET=your-secure-jwt-secret

# Email Configuration (optional)
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-email-password
```

### 4. Initialize Database

Run the database initialization script to create tables and sample data:

```bash
node init-db.js
```

This will create:
- Users table with admin and test users
- Audit logs table with sample data
- Required database indexes

### 5. Start the Server

```bash
npm start
```

The server will start on port 3000 (or the PORT specified in your .env file).

## API Endpoints

### Authentication

- `POST /api/users/register` - Register a new user
- `POST /api/users/login` - User login
- `GET /api/users/profile` - Get user profile (requires authentication)

### Admin (requires admin role)

- `GET /api/admin/audit_logs` - Get audit logs with filtering

### General

- `GET /api/health` - Health check endpoint

## Sample Users

After running `init-db.js`, you'll have these test accounts:

- **Admin**: username=`admin`, password=`admin123`
- **User**: username=`testuser`, password=`test123`

## Database Schema

### Users Table
- id (primary key)
- username (unique)
- email (unique)
- password (hashed)
- role (user/admin)
- is_verified
- reset_token, reset_token_expires
- verification_token
- created_at, updated_at

### Audit Logs Table
- id (primary key)
- user_id (foreign key to users)
- action
- metadata (JSON)
- outcome
- timestamp
- ip_address
- user_agent

## Usage Examples

### Register a User
```bash
curl -X POST http://localhost:3000/api/users/register \
  -H "Content-Type: application/json" \
  -d '{"username":"newuser","email":"user@example.com","password":"password123"}'
```

### Login
```bash
curl -X POST http://localhost:3000/api/users/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

### Get Audit Logs (Admin only)
```bash
curl -X GET "http://localhost:3000/api/admin/audit_logs?page=1&limit=10" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Development

- Use `npm run dev` to start the server with nodemon for auto-restart
- The original blockchain functionality is still available in `index.js` (run with `npm run blockchain`)

## Security Features

- Password hashing with bcryptjs
- JWT token authentication
- Role-based access control
- Rate limiting (100 requests per 15 minutes)
- SQL injection protection with parameterized queries
- CORS protection

## Error Handling

The API includes comprehensive error handling and logging for:
- Database connection issues
- Authentication failures
- Validation errors
- Server errors