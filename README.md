# ValveChain Sidecar API

A consolidated Express.js API service for the ValveChain platform that handles both blockchain valve operations and vendor registration functionality.

## Features

### Blockchain Operations
- Valve registration and transfer
- Maintenance logging
- Repair requests with escrow
- Repair completion logging

### Vendor Management
- Vendor registration with MSA (Master Service Agreement) file upload
- Email validation
- PDF file validation and storage

## Prerequisites

- Node.js (v18 or higher)
- npm

## Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables by copying and editing the `.env` file:
   ```bash
   cp .env.test .env
   ```

   Set the following variables:
   - `PRIVATE_KEY`: Ethereum wallet private key (for blockchain operations)
   - `RPC_URL`: Ethereum RPC endpoint (e.g., Infura)
   - `CONTRACT_ADDRESS`: ValveChain smart contract address
   - `PORT`: Server port (default: 8000)

## Usage

Start the server:
```bash
npm start
```

The API will be available at `http://localhost:8000`

## API Endpoints

### Health Check
- **GET** `/api/health`
  - Returns service status

### Blockchain Operations (requires blockchain connection)
- **POST** `/api/register-valve`
  - Body: `{ "serialNumber": "string", "details": "string" }`
  
- **POST** `/api/transfer-valve`
  - Body: `{ "serialNumber": "string", "to": "address" }`
  
- **POST** `/api/maintenance`
  - Body: `{ "serialNumber": "string", "description": "string", "reportHash": "string" }`
  
- **POST** `/api/repair-request`
  - Body: `{ "serialNumber": "string", "contractor": "address", "amountEth": "string" }`
  
- **POST** `/api/repair`
  - Body: `{ "serialNumber": "string", "preTestHash": "string", "repairHash": "string", "postTestHash": "string" }`

### Vendor Management
- **POST** `/register_vendor`
  - Content-Type: `multipart/form-data`
  - Form fields:
    - `vendor_name`: Vendor company name
    - `contact_email`: Valid email address
    - `msa_file`: PDF file (MSA document)

## File Storage

Uploaded MSA files are stored in the `uploads/` directory with unique filenames to prevent conflicts.

## Error Handling

- The API returns appropriate HTTP status codes
- Blockchain operations will return 503 if no blockchain connection is available
- File uploads are validated for PDF format
- Email addresses are validated using regex

## Architecture Changes

This service consolidates what was previously split between:
- Express.js service (blockchain operations)
- FastAPI service (vendor registration)

The vendor registration functionality has been ported from Python/FastAPI to Node.js/Express to eliminate the need for running multiple technology stacks.

## Development

To run without blockchain connection (useful for testing vendor registration):
1. Use `.env.test` environment (empty blockchain configuration)
2. Blockchain endpoints will return 503 errors, but vendor registration will work normally

## Dependencies

- `express`: Web framework
- `ethers`: Ethereum interaction
- `multer`: File upload handling
- `dotenv`: Environment variable management
- Additional dependencies for authentication and utilities