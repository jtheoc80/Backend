# User API Contract Documentation

## Overview

This document defines the API contract for user management operations in the ValveChain Backend. It specifies the input/output shapes, error codes, and data types to ensure consistent frontend-backend integration.

## Base URL
```
/api/auth
```

## Data Types

### User Object
```typescript
interface User {
  id: number;
  username: string;
  email: string;
  role: 'admin' | 'user';
  created_at: string;  // ISO 8601 datetime
  updated_at: string;  // ISO 8601 datetime
  is_verified: boolean;
  is_active: boolean;
}
```

### Error Response
```typescript
interface ErrorResponse {
  error: string;
}
```

### Success Response
```typescript
interface SuccessResponse {
  message: string;
}
```

## API Endpoints

### 1. User Registration

**POST** `/register`

**Request Body:**
```typescript
{
  username: string;     // Required, 3-50 characters, alphanumeric + underscore
  email: string;        // Required, valid email format
  password: string;     // Required, min 8 characters
  role?: 'admin' | 'user'; // Optional, defaults to 'user'
}
```

**Success Response (201):**
```typescript
{
  message: "User registered successfully.";
  user: User;
  token: string;        // JWT token
}
```

**Error Responses:**
- **400**: Missing required fields
- **409**: Email or username already exists
- **500**: Server error

### 2. User Login

**POST** `/login`

**Request Body:**
```typescript
{
  email: string;        // Required
  password: string;     // Required
}
```

**Success Response (200):**
```typescript
{
  message: "Login successful.";
  user: User;
  token: string;        // JWT token
}
```

**Error Responses:**
- **400**: Missing email or password
- **401**: Invalid credentials
- **500**: Server error

### 3. Get User Profile

**GET** `/profile`

**Headers:**
```typescript
Authorization: "Bearer <jwt_token>"
```

**Success Response (200):**
```typescript
{
  user: User;
}
```

**Error Responses:**
- **401**: Invalid or missing token
- **500**: Server error

### 4. Update User Profile

**PUT** `/profile`

**Headers:**
```typescript
Authorization: "Bearer <jwt_token>"
```

**Request Body:**
```typescript
{
  username?: string;    // Optional
  email?: string;       // Optional
}
```

**Success Response (200):**
```typescript
{
  message: "Profile updated successfully.";
  user: User;
}
```

**Error Responses:**
- **400**: No valid fields to update
- **401**: Invalid or missing token
- **409**: Username or email already taken
- **500**: Server error

### 5. Change Password

**PUT** `/change-password`

**Headers:**
```typescript
Authorization: "Bearer <jwt_token>"
```

**Request Body:**
```typescript
{
  currentPassword: string;  // Required
  newPassword: string;      // Required, min 8 characters
}
```

**Success Response (200):**
```typescript
{
  message: "Password changed successfully.";
}
```

**Error Responses:**
- **400**: Missing current or new password
- **401**: Current password incorrect or invalid token
- **500**: Server error

### 6. Request Password Reset

**POST** `/request-password-reset`

**Request Body:**
```typescript
{
  email: string;        // Required
}
```

**Success Response (200):**
```typescript
{
  message: "If the email exists, a password reset link has been sent.";
}
```

**Note:** Always returns success for security (doesn't reveal if email exists)

**Error Responses:**
- **400**: Missing email
- **500**: Server error

### 7. Reset Password

**POST** `/reset-password`

**Request Body:**
```typescript
{
  token: string;        // Required, reset token from email
  newPassword: string;  // Required, min 8 characters
}
```

**Success Response (200):**
```typescript
{
  message: "Password reset successfully.";
}
```

**Error Responses:**
- **400**: Missing token/password or invalid/expired token
- **500**: Server error

## Admin-Only Endpoints

### 8. List All Users

**GET** `/users`

**Headers:**
```typescript
Authorization: "Bearer <admin_jwt_token>"
```

**Query Parameters:**
```typescript
{
  page?: number;        // Default: 1
  limit?: number;       // Default: 10, max: 100
}
```

**Success Response (200):**
```typescript
{
  users: User[];
  page: number;
  limit: number;
}
```

**Error Responses:**
- **401**: Invalid token or insufficient permissions
- **403**: Not an admin user
- **500**: Server error

### 9. Get User by ID

**GET** `/users/:id`

**Headers:**
```typescript
Authorization: "Bearer <admin_jwt_token>"
```

**Success Response (200):**
```typescript
{
  user: User;
}
```

**Error Responses:**
- **401**: Invalid token or insufficient permissions
- **403**: Not an admin user (unless own profile)
- **404**: User not found
- **500**: Server error

### 10. Update User by ID

**PUT** `/users/:id`

**Headers:**
```typescript
Authorization: "Bearer <admin_jwt_token>"
```

**Request Body:**
```typescript
{
  username?: string;
  email?: string;
  role?: 'admin' | 'user';
  is_verified?: boolean;
  is_active?: boolean;
}
```

**Success Response (200):**
```typescript
{
  message: "User updated successfully.";
  user: User;
}
```

**Error Responses:**
- **400**: No valid fields to update
- **401**: Invalid token or insufficient permissions
- **403**: Not an admin user
- **404**: User not found
- **409**: Username or email already taken
- **500**: Server error

### 11. Delete User by ID

**DELETE** `/users/:id`

**Headers:**
```typescript
Authorization: "Bearer <admin_jwt_token>"
```

**Success Response (200):**
```typescript
{
  message: "User deleted successfully.";
}
```

**Error Responses:**
- **400**: Cannot delete own account
- **401**: Invalid token or insufficient permissions
- **403**: Not an admin user
- **404**: User not found
- **500**: Server error

## Rate Limiting

- **Authentication endpoints** (`/register`, `/login`, `/request-password-reset`, `/reset-password`): 5 requests per 15 minutes
- **General endpoints**: 100 requests per 15 minutes

## JWT Token

- **Expiration**: 24 hours (configurable via `JWT_EXPIRES_IN`)
- **Algorithm**: HS256
- **Payload includes**: `userId`, `role`, `iat`, `exp`

## Status Code Summary

- **200**: Success
- **201**: Created (registration)
- **400**: Bad Request (validation errors)
- **401**: Unauthorized (authentication failed)
- **403**: Forbidden (insufficient permissions)
- **404**: Not Found
- **409**: Conflict (duplicate data)
- **500**: Internal Server Error

## Database Schema Mapping

The API ensures proper data type conversion between database storage and API responses:

| Database Column | Database Type | API Response Type |
|-----------------|---------------|-------------------|
| id              | INTEGER       | number            |
| username        | VARCHAR(50)   | string            |
| email           | VARCHAR(100)  | string            |
| role            | VARCHAR(20)   | string            |
| created_at      | DATETIME      | string (ISO 8601) |
| updated_at      | DATETIME      | string (ISO 8601) |
| is_verified     | INTEGER (0/1) | boolean           |
| is_active       | INTEGER (0/1) | boolean           |

## Frontend Integration Notes

1. **Boolean Fields**: The API converts INTEGER status flags (0/1) to proper boolean values in responses
2. **Error Handling**: All error responses follow the standard `{ error: string }` format
3. **Token Management**: Include JWT token in `Authorization: Bearer <token>` header for protected routes
4. **Timestamps**: All datetime fields are returned in ISO 8601 format
5. **Validation**: Frontend should implement similar validation for immediate feedback before API calls

## Environment Variables

Required environment variables:
- `JWT_SECRET`: Secret key for JWT signing
- `JWT_EXPIRES_IN`: Token expiration time (default: '24h')
- `FRONTEND_URL`: Frontend URL for password reset links

## Testing

Use the test token endpoint for development:

**POST** `/test-token`

**Request Body:**
```typescript
{
  role?: 'admin' | 'user';    // Default: 'user'
  userId?: number;            // Default: 999
  username?: string;          // Default: 'testuser'
}
```

**Note**: Only available in non-production environments.