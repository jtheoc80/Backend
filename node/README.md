# ValveChain Sidecar API (Node.js/Express)

A blockchain-based valve management system built with Node.js and Express.

## Features

- **Valve Registration**: Register new valves on the blockchain
- **Valve Transfers**: Transfer valve ownership between parties
- **Maintenance Logging**: Log maintenance events with IPFS report hashes
- **Repair Management**: Request repairs with escrow functionality
- **Authentication & Authorization**: JWT-based auth with middleware
- **Audit Logging**: Track all system activities
- **Email Notifications**: Send notifications via NodeMailer

## API Endpoints

### Blockchain Operations
- `GET /api/health` - Health check endpoint
- `POST /api/register-valve` - Register a new valve
- `POST /api/transfer-valve` - Transfer valve ownership
- `POST /api/maintenance` - Log maintenance event
- `POST /api/repair-request` - Request repair with escrow
- `POST /api/repair` - Log repair completion

### Authentication (if implemented)
- Auth routes and middleware available in `authRoutes.js` and `authMiddleware.js`

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure environment variables in `.env`:
   ```
   PRIVATE_KEY=your_wallet_private_key
   RPC_URL=your_blockchain_rpc_url
   CONTRACT_ADDRESS=your_contract_address
   PORT=3000
   EMAIL_USER=your_email
   EMAIL_PASS=your_email_password
   ```

3. Start the server:
   ```bash
   npm start
   ```

## Dependencies

- **express**: Web framework
- **ethers**: Ethereum interaction library
- **bcryptjs**: Password hashing
- **jsonwebtoken**: JWT authentication
- **nodemailer**: Email sending

## Files

- `index.js` - Main application entry point
- `authRoutes.js` - Authentication routes
- `authMiddleware.js` - Authentication middleware
- `auditLogsRoute.js` - Audit logging routes
- `emailUtils.js` - Email utility functions
- `logActivity.js` - Activity logging utility
- `userController.js` - User management controller
- `userModel.js` - User data model
- `valvechainabi.json` - Smart contract ABI