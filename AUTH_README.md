# ValveChain Sidecar API - User Authentication System

## Overview
This project implements a complete JWT-based user authentication system for the ValveChain Sidecar API. The system includes user registration, login, profile management, and role-based access control.

## Features
- 🔐 JWT-based authentication
- 👤 User registration and login
- 🔒 Password hashing with bcrypt
- 🛡️ Role-based access control (admin/user)
- 📧 Email integration for notifications
- 🔄 Token refresh functionality
- ✅ Input validation and error handling

## API Endpoints

### Public Endpoints
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user and get JWT token

### Protected Endpoints (require JWT token)
- `GET /api/auth/profile` - Get current user profile
- `PUT /api/auth/profile` - Update user profile
- `POST /api/auth/change-password` - Change user password
- `POST /api/auth/refresh-token` - Refresh JWT token

### Admin Only Endpoints
- `GET /api/auth/users` - List all users
- `GET /api/auth/users/:id` - Get user by ID
- `DELETE /api/auth/users/:id` - Delete user

## Environment Variables
Add these to your `.env` file:

```
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-email-password
PORT=8000
```

## Usage Examples

### Register a user
```bash
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "john_doe",
    "email": "john@example.com",
    "password": "securepassword123"
  }'
```

### Login
```bash
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "securepassword123"
  }'
```

### Access protected endpoint
```bash
curl -X GET http://localhost:8000/api/auth/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Architecture

### Files Implemented
- **userModel.js** - User data model with CRUD operations
- **userController.js** - HTTP request handlers for user operations
- **authMiddleware.js** - JWT authentication middleware
- **userRoutes.js** - Express routes configuration

### User Model
The user model includes:
- ID (auto-generated)
- Username (unique)
- Email (unique)
- Password (hashed with bcrypt)
- Role (user/admin)
- Created/Updated timestamps
- Active status

### Authentication Flow
1. User registers with username, email, and password
2. Password is hashed using bcrypt
3. User logs in with email and password
4. Server validates credentials and returns JWT token
5. Client includes token in Authorization header for protected requests
6. Middleware validates token and extracts user information

## Security Features
- Password hashing with bcrypt (10 salt rounds)
- JWT tokens with configurable expiration
- Role-based access control
- Input validation for email format and password strength
- Protection against duplicate usernames/emails

## Development Notes
- Uses in-memory storage (easily replaceable with database)
- ES6 modules for consistency with existing codebase
- Comprehensive error handling
- Integration with existing email utilities
- Graceful handling of blockchain service availability

## Testing
The implementation has been manually tested with:
- User registration and validation
- User login and JWT generation
- Protected route access control
- Role-based permissions
- Password change functionality
- Error handling for invalid inputs

## Running the Server
```bash
npm install
npm start
```

The server will start on port 8000 (or the PORT specified in .env).