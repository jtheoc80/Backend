# User-Based Organization Administration Implementation

## Overview
This implementation adds comprehensive user-based administration roles for organizations to the ValveChain Backend API, meeting all requirements specified in the problem statement.

## Key Features Implemented

### 1. Single Company Blockchain Registration
- Only one company/organization can register on the blockchain
- Blockchain registration enforced through smart contract integration
- Registration attempts by additional companies are blocked with appropriate error messages

### 2. Organization Administrator Functionality
- Organization administrators can manage user access within their organization
- Admins can grant organization access to new users
- Admins can revoke organization access from existing users
- Admins can update user roles within the organization (admin/user)
- Admins can create and manage projects for their organization

### 3. User Role Limitations
- Users can access and complete project-related tasks
- Users cannot manage organization settings or other users
- Users are limited to project completion activities only
- Users can view projects assigned to them

### 4. Blockchain Permissions
- **Admins**: Can register company on blockchain, manage users, oversee organization projects
- **Users**: Can complete assigned project tasks only, cannot manage organization or user access
- All blockchain operations are logged with transaction hashes

### 5. Backend Integration
- Fully integrated with existing authentication system using JWT tokens
- Extended user model to include organization context
- Added organization-based access control middleware
- Enhanced data models for organization and project management

## Database Schema Extensions

### Organizations Table
```sql
CREATE TABLE organizations (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    blockchain_registered BOOLEAN DEFAULT 0,
    blockchain_registration_hash VARCHAR(66),
    wallet_address VARCHAR(42) UNIQUE,
    description TEXT,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Projects Table
```sql
CREATE TABLE projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    organization_id VARCHAR(50) NOT NULL,
    status VARCHAR(20) DEFAULT 'active',
    created_by INTEGER NOT NULL,
    assigned_users TEXT, -- JSON array of user IDs
    due_date DATE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Extended Users Table
- Added `organization_id` field to link users to organizations
- Added `organization_role` field ('admin' or 'user')

## API Endpoints

### Organization Management
- `POST /api/organizations/register` - Register organization on blockchain (enforces single company rule)
- `GET /api/organizations/:id` - Get organization details
- `GET /api/organizations/:id/users` - Get organization users (org admin only)
- `POST /api/organizations/users/:userId/access` - Grant/revoke user access (org admin only)

### Project Management
- `POST /api/organizations/projects` - Create project (org admin only)
- `GET /api/organizations/:id/projects` - Get organization projects
- `GET /api/projects/:id` - Get project details
- `PUT /api/projects/:id` - Update project (org admin only)
- `POST /api/projects/:id/assign` - Assign user to project (org admin only)
- `DELETE /api/projects/:id/users/:userId` - Remove user from project (org admin only)
- `POST /api/projects/:id/complete` - Complete project (assigned users only)
- `GET /api/users/projects` - Get user's assigned projects
- `DELETE /api/projects/:id` - Delete project (org admin only)

## Security Features

### Access Control
- Organization-based access control middleware
- Role-based permissions (system admin, org admin, user)
- Resource ownership validation
- JWT token authentication with organization context

### Blockchain Security
- Single company registration enforcement
- Transaction hash logging for audit trail
- Wallet address verification
- Mock blockchain service with realistic transaction simulation

### Audit Logging
- All administrative actions logged
- User access management tracked
- Project creation and completion logged
- Blockchain operations recorded

## Testing Results

All functionality has been thoroughly tested:
- ✅ Single company blockchain registration enforced
- ✅ Organization admin can manage users within organization
- ✅ Users can complete assigned project tasks
- ✅ Users cannot access organization management functions
- ✅ Blockchain permissions properly differentiated
- ✅ Audit logging captures all administrative activities
- ✅ Access control prevents unauthorized operations
- ✅ Project management workflow functional

## Usage Examples

### Register Organization (First and Only Allowed)
```bash
curl -X POST http://localhost:3000/api/organizations/register \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <admin-token>" \
  -d '{
    "id": "valvechain-corp",
    "name": "ValveChain Manufacturing Corporation",
    "description": "Leading industrial valve manufacturer",
    "wallet_address": "0x111d35Cc6436C0532925a3b8D0000a5492d95111"
  }'
```

### Grant User Access (Organization Admin)
```bash
curl -X POST http://localhost:3000/api/organizations/users/4/access \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <org-admin-token>" \
  -d '{
    "action": "grant",
    "organization_role": "user"
  }'
```

### Create Project (Organization Admin)
```bash
curl -X POST http://localhost:3000/api/organizations/projects \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <org-admin-token>" \
  -d '{
    "name": "Valve Quality Inspection Project",
    "description": "Comprehensive quality inspection of all manufactured valves",
    "assigned_users": [4],
    "due_date": "2025-09-01"
  }'
```

### Complete Project (Assigned User)
```bash
curl -X POST http://localhost:3000/api/projects/1/complete \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <user-token>"
```

This implementation successfully addresses all requirements while maintaining the existing API functionality and providing a robust foundation for organization-based user management.