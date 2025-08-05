# ValveChain Backend API

A Node.js/Express backend API for managing purchase orders, manufacturers, distributors, and valve tokenization in the ValveChain ecosystem, now enhanced with **ValveGPT Self-Learning capabilities**.

## Features

- **User Management**: Registration, authentication, and role-based access control
- **Purchase Order Management**: Complete CRUD operations for purchase orders
- **Manufacturer Management**: Manufacturer registration and validation
- **Distributor Management**: Distributor network management
- **Valve Tokenization**: Blockchain-based valve tracking
- **Audit Logging**: Comprehensive activity tracking
- **Territory Management**: Geographical distribution control
- **🆕 ValveGPT Self-Learning**: Automated content crawling, summarization, and semantic search for valve industry knowledge

## 🧠 ValveGPT Self-Learning System

The ValveGPT system automatically learns from valve industry sources to provide intelligent insights and answers. It includes:

### Components

1. **Intelligent Crawler** (`crawler.js`)
   - Automatically crawls valve industry websites
   - Extracts relevant technical content
   - Calculates content relevance scores
   - Configurable source URLs
   - Robust error handling and retry logic

2. **Content Processor** (`ingest.js`)
   - Summarizes content using OpenAI GPT models
   - Generates embeddings for semantic search
   - Stores in Pinecone vector database (with local fallback)
   - Batch processing for efficiency

3. **Job Scheduler** (`scheduler.js`)
   - Automated periodic updates (default: every 6 hours)
   - Manual execution capabilities
   - Comprehensive statistics and monitoring
   - Graceful shutdown handling

### ValveGPT API Endpoints

| Method | Endpoint | Description | Authentication |
|--------|----------|-------------|----------------|
| GET | `/api/valvegpt/status` | Get system status and statistics | Required |
| POST | `/api/valvegpt/run-once` | Manually trigger crawl and ingest | Required |
| POST | `/api/valvegpt/search` | Search for valve-related content | Required |
| POST | `/api/valvegpt/sources` | Update crawler source URLs | Required |

### Example Usage

```bash
# Get system status
curl -H "Authorization: Bearer <token>" http://localhost:3000/api/valvegpt/status

# Search for content
curl -H "Authorization: Bearer <token>" \
     -H "Content-Type: application/json" \
     -d '{"query": "ball valve maintenance", "topK": 5}' \
     http://localhost:3000/api/valvegpt/search

# Manually trigger learning process
curl -H "Authorization: Bearer <token>" \
     -X POST http://localhost:3000/api/valvegpt/run-once

# Update crawler sources
curl -H "Authorization: Bearer <token>" \
     -H "Content-Type: application/json" \
     -d '{"sources": ["https://example.com/valves"]}' \
     http://localhost:3000/api/valvegpt/sources
```

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

# 🆕 ValveGPT Self-Learning Configuration
# OpenAI API Key for content summarization and embeddings (Required)
OPENAI_API_KEY=your-openai-api-key-here

# Pinecone Configuration (Optional - will fallback to local storage)
PINECONE_API_KEY=your-pinecone-api-key-here
PINECONE_INDEX_NAME=valvegpt-embeddings

# Scheduler Configuration
VALVEGPT_AUTO_START=true
VALVEGPT_SCHEDULE=0 */6 * * *
SCHEDULER_TIMEZONE=UTC
```

### Key Environment Variables

- **OPENAI_API_KEY**: Required for ValveGPT content summarization and embeddings
- **PINECONE_API_KEY**: Optional vector database (falls back to local JSON storage)
- **VALVEGPT_AUTO_START**: Whether to start the scheduler automatically (default: true)
- **VALVEGPT_SCHEDULE**: Cron expression for update frequency (default: every 6 hours)
- **PO_CONTRACT_ADDRESS**: Smart contract address for purchase order blockchain operations
- **CONTRACT_ADDRESS**: Main ValveChain contract address for valve tokenization
- **JWT_SECRET**: Secret key for JWT token generation (change in production)
- **RPC_URL**: Ethereum RPC endpoint for blockchain interactions

## Installation

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

## 🚀 Quick Start with ValveGPT

1. **Basic Setup** (without OpenAI):
```bash
npm install
VALVEGPT_AUTO_START=false npm start
```

2. **Full Setup** (with OpenAI integration):
```bash
# Set your OpenAI API key
echo "OPENAI_API_KEY=your-key-here" >> .env

# Start with auto-learning enabled
npm start
```

3. **Test the System**:
```bash
# Run the demo script
node demo-valvegpt.js

# Or test manually
curl http://localhost:3000/api/health
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
│   ├── crawler.test.js      # 🆕 Crawler tests
│   ├── ingest.test.js       # 🆕 Content ingestor tests
│   ├── scheduler.test.js    # 🆕 Scheduler tests
│   └── ...                  # Other existing tests
├── data/                # 🆕 Local embeddings storage (created automatically)
├── node_modules/        # Dependencies
├── crawler.js           # 🆕 Web crawler for valve content
├── ingest.js           # 🆕 Content summarization and embedding
├── scheduler.js        # 🆕 Job scheduler for automation
├── demo-valvegpt.js    # 🆕 Demo script for ValveGPT features
├── poController.js      # PO business logic
├── poModel.js          # PO data model
├── poRoutes.js         # PO API routes
├── database.js         # Database configuration
├── index.js            # Main application entry (🆕 includes ValveGPT)
├── package.json        # Project dependencies
└── .env               # Environment variables
```

## License

This project is licensed under the MIT License.

## Support

For questions or support, please contact the development team or create an issue in the repository.