# Backend Services

This repository contains two backend services for the ValveChain project:

1. **ValveChain Sidecar API** (Node.js) - Blockchain interaction service
2. **Vendor Registration Service** (Python) - File upload and vendor management service

## Prerequisites

- Node.js 20+ 
- Python 3.12+
- Docker and Docker Compose (for containerized deployment)

## Services Overview

### ValveChain Sidecar API (Node.js)

A blockchain interaction service that provides REST API endpoints for valve registration, maintenance logging, and repair management on the ValveChain smart contract.

**Features:**
- Valve registration and transfer
- Maintenance event logging
- Repair request management with escrow
- Health check endpoint

**Port:** 8000

### Vendor Registration Service (Python)

A FastAPI-based service for vendor registration with file upload capabilities for MSA (Master Service Agreement) documents.

**Features:**
- Vendor registration with email validation
- PDF file upload for MSA documents
- Secure file storage

**Port:** 5000

## Local Development Setup

### Node.js Service Setup

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables:
```bash
cp .env.example .env
# Edit .env with your values:
# PRIVATE_KEY=your_ethereum_private_key
# RPC_URL=https://sepolia.infura.io/v3/your-infura-key
# CONTRACT_ADDRESS=0xYourValveChainContractAddress
# PORT=8000
```

3. Start the service:
```bash
npm start
```

The service will be available at `http://localhost:8000`

#### API Endpoints

- `GET /api/health` - Health check
- `POST /api/register-valve` - Register a new valve
- `POST /api/transfer-valve` - Transfer valve ownership
- `POST /api/maintenance` - Log maintenance event
- `POST /api/repair-request` - Request repair with escrow
- `POST /api/repair` - Log repair completion

### Python Service Setup

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Start the service:
```bash
uvicorn main:app --host 0.0.0.0 --port 5000
```

The service will be available at `http://localhost:5000`

#### API Endpoints

- `POST /register_vendor` - Register a vendor with MSA file upload

## Docker Deployment

### Quick Start with Docker Compose

1. Clone the repository:
```bash
git clone <repository-url>
cd Backend
```

2. Configure environment variables:
```bash
cp .env.example .env
# Edit .env with your blockchain connection details
```

3. Build and start all services:
```bash
docker-compose up -d
```

4. Check service status:
```bash
docker-compose ps
```

5. View logs:
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f valvechain-api
docker-compose logs -f vendor-service
```

6. Stop services:
```bash
docker-compose down
```

### Individual Service Deployment

#### Node.js Service

```bash
# Build the Docker image
docker build -f Dockerfile.node -t valvechain-api .

# Run the container
docker run -d \
  --name valvechain-api \
  -p 8000:8000 \
  --env-file .env \
  valvechain-api
```

#### Python Service

```bash
# Build the Docker image
docker build -f Dockerfile.python -t vendor-service .

# Run the container
docker run -d \
  --name vendor-service \
  -p 5000:5000 \
  -v $(pwd)/uploads:/app/uploads \
  vendor-service
```

## Environment Configuration

### Required Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Blockchain Configuration
PRIVATE_KEY=your_ethereum_private_key_here
RPC_URL=https://sepolia.infura.io/v3/your-infura-key
CONTRACT_ADDRESS=0xYourValveChainContractAddress

# Service Configuration
PORT=8000
```

**Important:** Never commit your actual private keys or sensitive credentials to version control.

## Development

### Project Structure

```
Backend/
├── abi/                    # Smart contract ABI files
│   └── ValveChainABI.json
├── uploads/                # File upload directory (created automatically)
├── node_modules/           # Node.js dependencies
├── .env                    # Environment configuration
├── .gitignore             # Git ignore rules
├── docker-compose.yml     # Multi-service deployment
├── Dockerfile.node        # Node.js service container
├── Dockerfile.python      # Python service container
├── index.js               # Node.js main application
├── main.py                # Python main application
├── package.json           # Node.js dependencies and scripts
├── requirements.txt       # Python dependencies
└── README.md              # This file
```

### Adding New Features

#### Node.js Service
- Add new routes in `index.js`
- Update contract interactions using ethers.js
- Follow RESTful API conventions

#### Python Service
- Add new endpoints in `main.py`
- Use Pydantic models for request validation
- Follow FastAPI best practices

### Testing

#### Node.js Service
```bash
# Health check
curl http://localhost:8000/api/health

# Test endpoints (requires valid blockchain configuration)
curl -X POST http://localhost:8000/api/register-valve \
  -H "Content-Type: application/json" \
  -d '{"serialNumber": "V12345", "details": "Test valve"}'
```

#### Python Service
```bash
# Test vendor registration
curl -X POST http://localhost:5000/register_vendor \
  -F "vendor_name=Test Vendor" \
  -F "contact_email=test@example.com" \
  -F "msa_file=@test.pdf"
```

## Production Deployment

### Security Considerations

1. **Environment Variables**: Use secure secret management for production
2. **HTTPS**: Deploy behind a reverse proxy with SSL/TLS
3. **File Uploads**: Implement file size limits and virus scanning
4. **Database**: Consider adding persistent storage for production data
5. **Monitoring**: Add logging and monitoring solutions

### Scaling

- Use container orchestration (Kubernetes, Docker Swarm) for scaling
- Add load balancers for high availability
- Consider separating services into different hosts/clusters
- Implement health checks and readiness probes

## Troubleshooting

### Common Issues

1. **Node.js blockchain connection errors**: Verify RPC_URL and network connectivity
2. **Python email validation errors**: Ensure email-validator package is installed
3. **File upload failures**: Check uploads directory permissions
4. **Port conflicts**: Ensure ports 8000 and 5000 are available

### Logs

```bash
# Docker Compose logs
docker-compose logs -f [service-name]

# Individual container logs
docker logs -f container-name

# Local development logs
# Node.js logs appear in console
# Python logs with uvicorn --log-level debug
```

## License

[Add your license information here]

## Contributing

[Add contributing guidelines here]

## Support

[Add support contact information here]