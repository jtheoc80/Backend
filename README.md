# Backend Services

This repository contains two distinct backend services that have been organized into separate directories for clarity and maintainability.

## Repository Structure

```
Backend/
├── node/                   # Node.js/Express service
│   ├── index.js           # ValveChain Sidecar API
│   ├── package.json       # Node.js dependencies
│   ├── authRoutes.js      # Authentication routes
│   ├── auditLogsRoute.js  # Audit logging
│   ├── emailUtils.js      # Email utilities
│   └── README.md          # Node.js service documentation
├── python/                # Python/FastAPI service
│   ├── main.py           # Vendor registration API
│   ├── requirements.txt  # Python dependencies
│   └── README.md         # Python service documentation
└── README.md             # This file
```

## Services Overview

### 1. ValveChain Sidecar API (Node.js)
**Location**: `./node/`  
**Port**: 3000 (default)

A comprehensive blockchain-based valve management system featuring:
- Valve registration and transfer on blockchain
- Maintenance and repair logging
- Authentication and authorization
- Audit logging capabilities
- Email notifications

### 2. Vendor Registration API (Python)
**Location**: `./python/`  
**Port**: 8000 (default)

A FastAPI service for vendor management featuring:
- Vendor registration with validation
- MSA (Master Service Agreement) file upload
- PDF validation and storage
- Email validation

## Quick Start

### Starting the Node.js Service
```bash
cd node
npm install
npm start
```
Service will be available at `http://localhost:3000`

### Starting the Python Service
```bash
cd python
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```
Service will be available at `http://localhost:8000`

## Configuration

Both services use `.env` files for configuration. Copy and modify the `.env` files in each service directory according to your requirements.

### Node.js Service Configuration
- `PRIVATE_KEY`: Blockchain wallet private key
- `RPC_URL`: Blockchain RPC endpoint
- `CONTRACT_ADDRESS`: Smart contract address
- `PORT`: Service port (default: 3000)
- `EMAIL_USER` & `EMAIL_PASS`: Email service credentials

### Python Service Configuration
- Add any specific Python service configuration as needed

## Development

Each service can be developed, tested, and deployed independently:

- **Node.js Service**: Uses Express.js with ethers.js for blockchain interactions
- **Python Service**: Uses FastAPI with web3.py for blockchain interactions

## Documentation

For detailed API documentation and setup instructions, see the README files in each service directory:
- [Node.js Service Documentation](./node/README.md)
- [Python Service Documentation](./python/README.md)