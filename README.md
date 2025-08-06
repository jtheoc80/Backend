# ValveChain Backend API

A Node.js/Express backend API for managing purchase orders, manufacturers, distributors, and valve tokenization in the ValveChain ecosystem.

## Features

- **User Management**: Registration, authentication, and role-based access control
- **Purchase Order Management**: Complete CRUD operations for purchase orders
- **Manufacturer Management**: Manufacturer registration and validation
- **Distributor Management**: Distributor network management
- **Valve Tokenization**: Blockchain-based valve tracking
- **Audit Logging**: Comprehensive activity tracking
- **Territory Management**: Geographical distribution control
- **Cloud Ready**: Containerized with deployment configs for AWS, Azure, GCP, and Kubernetes
- **Production Ready**: Enhanced logging, error handling, and monitoring

## Quick Start

### Local Development

1. **Clone and install**:
   ```bash
   git clone <repository-url>
   cd Backend
   npm install
   ```

2. **Configure environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your actual values
   ```

3. **Run the application**:
   ```bash
   npm start
   ```

4. **Run with Docker**:
   ```bash
   docker-compose up
   ```

### Cloud Deployment

This application is cloud-ready with deployment configurations for:

- **AWS** (ECS Fargate with Terraform)
- **Azure** (Container Apps with ARM templates)
- **Google Cloud** (Cloud Run with deployment scripts)
- **Kubernetes** (Complete manifests for any K8s cluster)

📖 **[See detailed cloud deployment guide](CLOUD_DEPLOYMENT.md)**

## Purchase Order Workflow

The Purchase Order (PO) system enables seamless order management between manufacturers and distributors:

### PO Lifecycle
1. **Creation**: Distributors create purchase orders with item details and pricing
2. **Review**: Purchase orders are validated and checked for completeness  
3. **Approval**: Authorized users can approve or reject purchase orders
4. **Tracking**: All PO activities are logged for audit trails

### PO Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/pos` | Create a new purchase order |
| GET | `/api/pos` | List purchase orders (with pagination and filtering) |
| GET | `/api/pos/:id` | Get purchase order by ID |
| GET | `/api/pos/number/:po_number` | Get purchase order by PO number |
| PUT | `/api/pos/:id` | Update purchase order (pending only) |
| POST | `/api/pos/:id/approve` | Approve purchase order |
| POST | `/api/pos/:id/reject` | Reject purchase order |

### PO Status Flow
- **pending** → **approved** or **rejected**
- Only pending POs can be updated or processed
- All status changes are logged for audit

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Database
DATABASE_PATH=./users.db

# JWT Configuration  
JWT_SECRET=your-secret-key-change-this-in-production
JWT_EXPIRES_IN=24h

# Blockchain Configuration
PRIVATE_KEY=your-blockchain-private-key
RPC_URL=https://sepolia.infura.io/v3/your-infura-key
CONTRACT_ADDRESS=0xYourValveChainContractAddress
PO_CONTRACT_ADDRESS=0xYourPurchaseOrderContractAddress

# Email Configuration (Optional)
SMTP_HOST=your-smtp-host
SMTP_PORT=587
SMTP_USER=your-email@domain.com
SMTP_PASS=your-email-password
```

### Key Environment Variables

- **PO_CONTRACT_ADDRESS**: Smart contract address for purchase order blockchain operations
- **CONTRACT_ADDRESS**: Main ValveChain contract address for valve tokenization
- **JWT_SECRET**: Secret key for JWT token generation (change in production)
- **RPC_URL**: Ethereum RPC endpoint for blockchain interactions

## Frontend Integration

This backend is designed for seamless integration with frontend applications. It provides a comprehensive REST API with proper CORS configuration, consistent JSON responses, and comprehensive error handling.

### Quick Integration Guide

1. **API Base URL**: `http://localhost:8000` (or your deployed URL)
2. **All endpoints return JSON responses**
3. **CORS is pre-configured for development**
4. **Authentication uses JWT tokens in Authorization header**

### CORS Configuration

The backend automatically handles Cross-Origin Resource Sharing (CORS):

- **Development Mode**: All origins are allowed for easy development
- **Production Mode**: Only specified origins in `ALLOWED_ORIGINS` environment variable
- **Credentials**: Supported for authentication cookies/headers
- **Headers**: Supports `Content-Type`, `Authorization`, and `X-Requested-With`
- **Methods**: `GET`, `POST`, `PUT`, `DELETE`, `OPTIONS`

### Environment Configuration for Frontend

Add these variables to your `.env` file:

```env
# CORS Configuration
ALLOWED_ORIGINS=http://localhost:3001,http://localhost:4200,http://localhost:5173

# Set to 'production' to restrict CORS to ALLOWED_ORIGINS only
NODE_ENV=development
```

### Authentication Flow

1. **Register/Login** to get JWT token:
   ```javascript
   const response = await fetch('http://localhost:8000/api/auth/login', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({ username: 'user', password: 'pass' })
   });
   const { token } = await response.json();
   ```

2. **Use token in subsequent requests**:
   ```javascript
   const response = await fetch('http://localhost:8000/api/pos', {
     headers: { 
       'Authorization': `Bearer ${token}`,
       'Content-Type': 'application/json'
     }
   });
   ```

### API Response Format

All endpoints return consistent JSON responses:

**Success Response:**
```json
{
  "data": { /* response data */ },
  "message": "Operation successful",
  "timestamp": "2025-08-06T02:42:30.811Z"
}
```

**Error Response:**
```json
{
  "error": "Error description",
  "timestamp": "2025-08-06T02:42:30.811Z"
}
```

**Paginated Response:**
```json
{
  "data": [ /* array of items */ ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 5,
    "totalCount": 50,
    "limit": 10,
    "hasNext": true,
    "hasPrev": false
  }
}
```

### Common Frontend Integration Patterns

#### React/Next.js Example:
```javascript
// API service
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const apiCall = async (endpoint, options = {}) => {
  const token = localStorage.getItem('token');
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...options.headers
    },
    ...options
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'API request failed');
  }
  
  return response.json();
};

// Usage
const purchaseOrders = await apiCall('/api/pos');
const newPO = await apiCall('/api/pos', {
  method: 'POST',
  body: JSON.stringify(poData)
});
```

#### Vue.js/Angular Example:
```javascript
// axios configuration
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.VUE_APP_API_URL || 'http://localhost:8000',
  headers: { 'Content-Type': 'application/json' }
});

// Request interceptor for auth
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Usage
const { data } = await api.get('/api/pos');
const response = await api.post('/api/pos', poData);
```

### Error Handling

The API provides consistent error responses that frontend can handle uniformly:

```javascript
try {
  const response = await fetch('/api/pos', { method: 'POST', ... });
  if (!response.ok) {
    const error = await response.json();
    
    // Handle specific error cases
    switch (response.status) {
      case 401:
        // Redirect to login
        break;
      case 403:
        // Show unauthorized message
        break;
      case 422:
        // Show validation errors
        break;
      default:
        // Show generic error
        console.error(error.error);
    }
  }
} catch (networkError) {
  // Handle network/connection errors
  console.error('Network error:', networkError.message);
}
```

### Development vs Production

**Development Features:**
- CORS allows all origins
- Detailed error messages with stack traces
- Additional debugging endpoints

**Production Configuration:**
- Restricted CORS origins via `ALLOWED_ORIGINS`
- Sanitized error messages
- Enhanced security headers

### Testing API Integration

Test your frontend integration with these endpoints:

1. **Health Check**: `GET /api/health` (no auth required)
2. **User Registration**: `POST /api/auth/register`
3. **User Login**: `POST /api/auth/login`
4. **Protected Resource**: `GET /api/pos` (requires auth)

### WebSocket/Real-time Updates

For real-time features, consider implementing WebSocket connections or Server-Sent Events. The current API supports polling patterns with efficient pagination.

1. Clone the repository:
```bash
git clone <repository-url>
cd Backend
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Start the server:
```bash
npm start
```

## Testing

The project includes comprehensive unit tests using Jest and Supertest:

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

### Test Coverage

- **Routes**: Complete test coverage for all PO endpoints
- **Authentication**: Token validation and authorization tests
- **Validation**: Input validation and error handling tests
- **Database**: Mock database operations and error scenarios
- **Integration**: Full request/response cycle testing

The test suite includes 33 tests covering:
- ✅ Create PO workflow
- ✅ Fetch PO operations
- ✅ List PO with pagination and filtering
- ✅ Approve/Reject PO workflows
- ✅ Authentication and authorization
- ✅ Error handling and validation
- ✅ Database error scenarios

## API Documentation

### Authentication

All PO endpoints require JWT authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

### Create Purchase Order

```bash
POST /api/pos
Content-Type: application/json
Authorization: Bearer <token>

{
  "po_number": "PO-2024-001",
  "manufacturer_id": "mfg001",
  "distributor_id": "dist001",
  "total_amount": 1000.50,
  "currency": "USD",
  "items": [
    {
      "valve_id": "valve-001",
      "quantity": 2,
      "unit_price": 500.25,
      "description": "Ball Valve 1/2 inch"
    }
  ],
  "notes": "Urgent order for Q1 delivery"
}
```

### List Purchase Orders

```bash
GET /api/pos?page=1&limit=10&status=pending&sortBy=created_at&sortOrder=DESC
Authorization: Bearer <token>
```

Query parameters:
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10, max: 100)
- `status`: Filter by status (pending, approved, rejected, cancelled)
- `manufacturer_id`: Filter by manufacturer
- `distributor_id`: Filter by distributor
- `sortBy`: Sort field (created_at, updated_at, total_amount, po_number, status)
- `sortOrder`: Sort direction (ASC, DESC)

### Response Format

```json
{
  "purchaseOrders": [...],
  "pagination": {
    "currentPage": 1,
    "totalPages": 5,
    "totalCount": 50,
    "limit": 10,
    "hasNext": true,
    "hasPrev": false
  }
}
```

## Database Schema

### Purchase Orders Table

```sql
CREATE TABLE purchase_orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    po_number VARCHAR(100) UNIQUE NOT NULL,
    manufacturer_id VARCHAR(50) NOT NULL,
    distributor_id VARCHAR(50) NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    status VARCHAR(20) DEFAULT 'pending',
    items TEXT NOT NULL,
    notes TEXT,
    approved_by INTEGER,
    approved_at DATETIME,
    blockchain_transaction_hash VARCHAR(66),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (manufacturer_id) REFERENCES manufacturers(id),
    FOREIGN KEY (distributor_id) REFERENCES distributors(id),
    FOREIGN KEY (approved_by) REFERENCES users(id)
);
```

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-feature`
3. Write tests for your changes
4. Ensure all tests pass: `npm test`
5. Commit your changes: `git commit -am 'Add new feature'`
6. Push to the branch: `git push origin feature/new-feature`
7. Submit a pull request

## Project Structure

```
Backend/
├── __tests__/           # Test files
├── node_modules/        # Dependencies
├── poController.js      # PO business logic
├── poModel.js          # PO data model
├── poRoutes.js         # PO API routes
├── database.js         # Database configuration
├── index.js            # Main application entry
├── package.json        # Project dependencies
└── .env               # Environment variables
```

## License

This project is licensed under the MIT License.

## Support

For questions or support, please contact the development team or create an issue in the repository.