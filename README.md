# ValveChain Backend API

A comprehensive backend solution providing blockchain integration for valve management and vendor registration services.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Services](#services)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Running the Services](#running-the-services)
- [API Documentation](#api-documentation)
- [Testing](#testing)
- [Docker Deployment](#docker-deployment)
- [Development Guide](#development-guide)
- [Contributing](#contributing)

## Overview

This project consists of two main services:

1. **ValveChain Sidecar API** (Express.js) - Blockchain integration for valve lifecycle management
2. **Vendor Management API** (FastAPI) - Vendor registration and document management

## Architecture

```
┌─────────────────────┐    ┌─────────────────────┐
│   ValveChain API    │    │ Vendor Management   │
│    (Express.js)     │    │     (FastAPI)       │
│                     │    │                     │
│ ┌─────────────────┐ │    │ ┌─────────────────┐ │
│ │   Blockchain    │ │    │ │  File Upload    │ │
│ │   Integration   │ │    │ │   Validation    │ │
│ └─────────────────┘ │    │ └─────────────────┘ │
│                     │    │                     │
│ ┌─────────────────┐ │    │ ┌─────────────────┐ │
│ │ Valve Lifecycle │ │    │ │ Email Validator │ │
│ │   Management    │ │    │ │  PDF Handling   │ │
│ └─────────────────┘ │    │ └─────────────────┘ │
└─────────────────────┘    └─────────────────────┘
          │                           │
          └─────────┬─────────────────┘
                    │
        ┌─────────────────────┐
        │     Database        │
        │   (PostgreSQL)      │
        └─────────────────────┘
```

## Services

### ValveChain Sidecar API (Express.js)

Provides blockchain integration for:
- Valve registration
- Valve transfers
- Maintenance logging
- Repair requests
- Repair logging

**Port:** 3000 (default)

### Vendor Management API (FastAPI)

Provides functionality for:
- Vendor registration
- MSA (Master Service Agreement) file upload
- Email validation
- Document management

**Port:** 8000 (default)

## Prerequisites

- **Node.js** >= 18.0.0
- **Python** >= 3.8
- **npm** or **yarn**
- **pip** (Python package manager)
- **PostgreSQL** (optional, for production)

## Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd Backend
```

### 2. Install Node.js Dependencies

```bash
npm install
```

### 3. Install Python Dependencies

```bash
pip install -r requirements.txt
```

### 4. Install Additional Python Dependencies

```bash
pip install 'pydantic[email]' python-multipart
```

## Configuration

### Environment Variables

Create a `.env` file in the project root:

```env
# ValveChain API Configuration
PRIVATE_KEY=your_ethereum_private_key_here
RPC_URL=https://sepolia.infura.io/v3/your_infura_key
CONTRACT_ADDRESS=0xYourValveChainContractAddress
PORT=3000

# FastAPI Configuration
VENDOR_API_PORT=8000

# Email Configuration (for notifications)
EMAIL_USER=your_email@example.com
EMAIL_PASS=your_app_password

# Database Configuration (optional)
DATABASE_URL=postgresql://username:password@localhost:5432/valvechain

# Development/Testing
NODE_ENV=development
```

### Sample Environment Variables

For development and testing, you can use these sample values:

```env
# ValveChain API Configuration
PRIVATE_KEY=37836abd391a34b4da04201b8b7031ba18ae27896332680206bec0e2e6902af6
RPC_URL=https://sepolia.infura.io/v3/your-infura-key
CONTRACT_ADDRESS=0xYourValveChainContractAddress
PORT=3000

# FastAPI Configuration
VENDOR_API_PORT=8000

# Email Configuration
EMAIL_USER=test@example.com
EMAIL_PASS=test_password

# Development
NODE_ENV=development
```

## Running the Services

### Development Mode

#### Start ValveChain API (Express.js)

```bash
npm run dev
```

#### Start Vendor Management API (FastAPI)

```bash
uvicorn main:app --reload --port 8000
```

### Production Mode

#### Start ValveChain API

```bash
npm start
```

#### Start Vendor Management API

```bash
uvicorn main:app --host 0.0.0.0 --port 8000
```

## API Documentation

### ValveChain Sidecar API (Express.js)

**Base URL:** `http://localhost:3000`

#### Endpoints

##### Health Check
- **GET** `/api/health`
- **Description:** Check API status
- **Response:** 
  ```json
  {
    "status": "ValveChain Sidecar API running"
  }
  ```

##### Register Valve
- **POST** `/api/register-valve`
- **Description:** Register a new valve on the blockchain
- **Body:**
  ```json
  {
    "serialNumber": "VALVE-001",
    "details": "High-pressure safety valve"
  }
  ```
- **Response:**
  ```json
  {
    "success": true,
    "txHash": "0x1234567890abcdef..."
  }
  ```

##### Transfer Valve
- **POST** `/api/transfer-valve`
- **Description:** Transfer valve ownership
- **Body:**
  ```json
  {
    "serialNumber": "VALVE-001",
    "to": "0x742d35Cc6635Bc0532E3D35DEA8DC3A2B6320e17"
  }
  ```
- **Response:**
  ```json
  {
    "success": true,
    "txHash": "0x1234567890abcdef..."
  }
  ```

##### Log Maintenance
- **POST** `/api/maintenance`
- **Description:** Log maintenance event
- **Body:**
  ```json
  {
    "serialNumber": "VALVE-001",
    "description": "Routine pressure test",
    "reportHash": "0xabc123def456"
  }
  ```
- **Response:**
  ```json
  {
    "success": true,
    "txHash": "0x1234567890abcdef..."
  }
  ```

##### Request Repair
- **POST** `/api/repair-request`
- **Description:** Request repair with escrow
- **Body:**
  ```json
  {
    "serialNumber": "VALVE-001",
    "contractor": "0x742d35Cc6635Bc0532E3D35DEA8DC3A2B6320e17",
    "amountEth": "0.1"
  }
  ```
- **Response:**
  ```json
  {
    "success": true,
    "txHash": "0x1234567890abcdef..."
  }
  ```

##### Log Repair
- **POST** `/api/repair`
- **Description:** Log completed repair
- **Body:**
  ```json
  {
    "serialNumber": "VALVE-001",
    "preTestHash": "0xpre123",
    "repairHash": "0xrepair456",
    "postTestHash": "0xpost789"
  }
  ```
- **Response:**
  ```json
  {
    "success": true,
    "txHash": "0x1234567890abcdef..."
  }
  ```

### Vendor Management API (FastAPI)

**Base URL:** `http://localhost:8000`

**Interactive Documentation:** `http://localhost:8000/docs`

#### Endpoints

##### Root
- **GET** `/`
- **Description:** API status
- **Response:**
  ```json
  {
    "message": "Vendor Management API is running"
  }
  ```

##### Health Check
- **GET** `/health`
- **Description:** Health status
- **Response:**
  ```json
  {
    "status": "healthy",
    "service": "vendor-management"
  }
  ```

##### Register Vendor
- **POST** `/register_vendor`
- **Description:** Register a new vendor with MSA upload
- **Content-Type:** `multipart/form-data`
- **Form Data:**
  - `vendor_name` (string): Vendor company name
  - `contact_email` (string): Valid email address
  - `msa_file` (file): PDF file containing Master Service Agreement
- **Response:**
  ```json
  {
    "message": "Vendor registered successfully",
    "vendor_name": "Test Vendor Inc.",
    "contact_email": "contact@testvendor.com",
    "file_path": "uploads/msa_agreement.pdf"
  }
  ```

#### Error Responses

All APIs return appropriate HTTP status codes:
- `200` - Success
- `201` - Created (for POST operations)
- `400` - Bad Request (validation errors)
- `404` - Not Found
- `422` - Unprocessable Entity (FastAPI validation)
- `500` - Internal Server Error

## Testing

### Node.js Tests (Jest)

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Python Tests (pytest)

```bash
# Run all tests
python -m pytest

# Run with verbose output
python -m pytest -v

# Run specific test file
python -m pytest tests/test_fastapi.py

# Run with coverage
python -m pytest --cov=main
```

### Test Coverage

The test suites cover:
- ✅ All API endpoints
- ✅ Input validation
- ✅ Error handling
- ✅ File upload functionality
- ✅ Email validation
- ✅ Blockchain integration (mocked)

## Docker Deployment

### Using Docker Compose

Create a `docker-compose.yml` file:

```yaml
version: '3.8'

services:
  valvechain-api:
    build: 
      context: .
      dockerfile: Dockerfile.node
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
    env_file:
      - .env

  vendor-api:
    build:
      context: .
      dockerfile: Dockerfile.python
    ports:
      - "8000:8000"
    environment:
      - PYTHONPATH=/app
    env_file:
      - .env
    volumes:
      - ./uploads:/app/uploads

  postgres:
    image: postgres:13
    environment:
      POSTGRES_DB: valvechain
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

### Individual Dockerfiles

#### Dockerfile.node (ValveChain API)

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3000

CMD ["npm", "start"]
```

#### Dockerfile.python (Vendor API)

```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

RUN pip install 'pydantic[email]' python-multipart

COPY main.py .
COPY abi/ ./abi/

RUN mkdir -p uploads

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Deploy with Docker

```bash
# Build and start all services
docker-compose up --build

# Run in background
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## Development Guide

### Project Structure

```
Backend/
├── app.js              # Express.js application logic
├── index.js            # Express.js entry point
├── main.py             # FastAPI application
├── package.json        # Node.js dependencies and scripts
├── requirements.txt    # Python dependencies
├── .env               # Environment variables
├── .gitignore         # Git ignore rules
├── README.md          # This file
├── abi/               # Blockchain contract ABI
│   └── ValveChainABI.json
├── tests/             # Test files
│   ├── api.test.js    # Express.js tests
│   └── test_fastapi.py # FastAPI tests
├── uploads/           # File upload directory
└── node_modules/      # Node.js dependencies (auto-generated)
```

### Adding New Features

#### Express.js API

1. Add route handlers in `app.js`
2. Add corresponding tests in `tests/api.test.js`
3. Update API documentation in README

#### FastAPI

1. Add endpoint functions in `main.py`
2. Add Pydantic models for validation
3. Add tests in `tests/test_fastapi.py`
4. FastAPI automatically updates `/docs` endpoint

### Code Style and Linting

#### JavaScript

```bash
# Install ESLint (optional)
npm install --save-dev eslint

# Run linting
npx eslint .
```

#### Python

```bash
# Install formatting tools
pip install black flake8

# Format code
black .

# Check style
flake8 .
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Commit your changes (`git commit -m 'Add amazing feature'`)
7. Push to the branch (`git push origin feature/amazing-feature`)
8. Open a Pull Request

### Commit Guidelines

- Use clear, descriptive commit messages
- Include tests for new features
- Update documentation for API changes
- Ensure all tests pass before committing

## Security Considerations

- Keep private keys secure and never commit them
- Validate all inputs on both frontend and backend
- Use HTTPS in production
- Implement rate limiting for production APIs
- Regularly update dependencies

## Troubleshooting

### Common Issues

#### Node.js

- **Module not found**: Run `npm install`
- **Port already in use**: Change PORT in `.env` or kill process using the port
- **Blockchain connection fails**: Check RPC_URL and network connectivity

#### Python

- **Module not found**: Install missing dependencies with `pip install`
- **File upload fails**: Check uploads directory permissions
- **Email validation fails**: Install `pip install 'pydantic[email]'`

#### Testing

- **Tests fail**: Ensure `NODE_ENV=test` for Node.js tests
- **Coverage issues**: Install coverage tools and run with coverage flags

## License

This project is licensed under the ISC License - see the LICENSE file for details.

## Support

For support, please open an issue on the GitHub repository or contact the development team.