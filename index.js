import dotenv from 'dotenv';
import express from 'express';
import { ethers } from 'ethers';
import contractABI from './abi/ValveChainABI.json' assert { type: 'json' };
import { asyncHandler, errorHandler, notFoundHandler } from './middleware/errorHandler.js';

dotenv.config();

const app = express();
app.use(express.json());

const { PRIVATE_KEY, RPC_URL, CONTRACT_ADDRESS, PORT } = process.env;

// Setup ethers provider/wallet with error handling
let provider, wallet, contract;

try {
  provider = new ethers.JsonRpcProvider(RPC_URL);
  wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  contract = new ethers.Contract(CONTRACT_ADDRESS, contractABI, wallet);
  console.log('Blockchain connection initialized');
} catch (error) {
  console.warn('Blockchain connection failed, using mock mode:', error.message);
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ValveChain Sidecar API running' });
});

// Test error handling endpoint
app.get('/api/test-error', asyncHandler(async (req, res) => {
  throw new Error('This is a test error to verify error handling');
}));

// Test validation error endpoint
app.post('/api/test-validation', asyncHandler(async (req, res) => {
  const { name, email } = req.body;
  
  if (!name) {
    const error = new Error('Name is required');
    error.name = 'ValidationError';
    throw error;
  }
  
  if (!email || !email.includes('@')) {
    const error = new Error('Valid email is required');
    error.name = 'ValidationError';
    throw error;
  }
  
  res.json({ success: true, message: 'Validation passed', data: { name, email } });
}));

// Register Valve (native support)
app.post('/api/register-valve', asyncHandler(async (req, res) => {
  const { serialNumber, details } = req.body;
  if (!serialNumber || !details) {
    return res.status(400).json({ 
      success: false, 
      error: { message: 'serialNumber and details required', status: 400 } 
    });
  }
  
  const tx = await contract.registerValve(serialNumber, details);
  await tx.wait();
  res.json({ success: true, txHash: tx.hash });
}));

// Transfer Valve (native support)
app.post('/api/transfer-valve', asyncHandler(async (req, res) => {
  const { serialNumber, to } = req.body;
  if (!serialNumber || !to) {
    return res.status(400).json({ 
      success: false, 
      error: { message: 'serialNumber and to required', status: 400 } 
    });
  }
  
  const tx = await contract.transferValve(serialNumber, to);
  await tx.wait();
  res.json({ success: true, txHash: tx.hash });
}));

// Log Maintenance Event
app.post('/api/maintenance', asyncHandler(async (req, res) => {
  const { serialNumber, description, reportHash } = req.body;
  if (!serialNumber || !description || !reportHash) {
    return res.status(400).json({ 
      success: false, 
      error: { message: 'serialNumber, description, and reportHash required', status: 400 } 
    });
  }
  
  const tx = await contract.logMaintenance(serialNumber, description, reportHash);
  await tx.wait();
  res.json({ success: true, txHash: tx.hash });
}));

// Request Repair (with escrow)
app.post('/api/repair-request', asyncHandler(async (req, res) => {
  const { serialNumber, contractor, amountEth } = req.body;
  if (!serialNumber || !contractor || !amountEth) {
    return res.status(400).json({ 
      success: false, 
      error: { message: 'serialNumber, contractor, and amountEth required', status: 400 } 
    });
  }
  
  const tx = await contract.requestRepair(
    serialNumber,
    contractor,
    { value: ethers.parseEther(amountEth) }
  );
  await tx.wait();
  res.json({ success: true, txHash: tx.hash });
}));

// Log Repair
app.post('/api/repair', asyncHandler(async (req, res) => {
  const { serialNumber, preTestHash, repairHash, postTestHash } = req.body;
  if (!serialNumber || !preTestHash || !repairHash || !postTestHash) {
    return res.status(400).json({ 
      success: false, 
      error: { message: 'serialNumber, preTestHash, repairHash, and postTestHash required', status: 400 } 
    });
  }
  
  const tx = await contract.logRepair(serialNumber, preTestHash, repairHash, postTestHash);
  await tx.wait();
  res.json({ success: true, txHash: tx.hash });
}));

// Example: Add more endpoints for audit, confirm, etc. as needed

// 404 handler for routes that don't exist
app.use(notFoundHandler);

// Error handling middleware (must be last)
app.use(errorHandler);

// Start server
app.listen(PORT || 3000, () => {
  console.log(`ValveChain Sidecar API running on port ${PORT || 3000}`);
});
