import dotenv from 'dotenv';
import express from 'express';
import { ethers } from 'ethers';
import contractABI from './valvechainabi_minimal.json' assert { type: 'json' };
import { 
    asyncHandler, 
    validateBody, 
    valveRegistrationSchema,
    valveTransferSchema,
    maintenanceSchema,
    repairRequestSchema,
    repairSchema
} from './errorHandler.js';

dotenv.config();

const app = express();
app.use(express.json());

const { PRIVATE_KEY, RPC_URL, CONTRACT_ADDRESS, PORT } = process.env;

// Setup ethers provider/wallet with error handling
let provider, wallet, contract;

// For testing purposes, disable blockchain connection to focus on error handling
console.log('Running in mock mode for testing error handling functionality');

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ValveChain Sidecar API running' });
});

// Register Valve (native support)
app.post('/api/register-valve', validateBody(valveRegistrationSchema), asyncHandler(async (req, res) => {
  const { serialNumber, details } = req.body;
  
  if (!contract) {
    return res.status(503).json({
      success: false,
      error: 'Service unavailable',
      message: 'Blockchain service is not available'
    });
  }
  
  const tx = await contract.registerValve(serialNumber, details);
  await tx.wait();
  res.json({ success: true, txHash: tx.hash });
}));

// Transfer Valve (native support)
app.post('/api/transfer-valve', validateBody(valveTransferSchema), asyncHandler(async (req, res) => {
  const { serialNumber, to } = req.body;
  
  if (!contract) {
    return res.status(503).json({
      success: false,
      error: 'Service unavailable',
      message: 'Blockchain service is not available'
    });
  }
  
  const tx = await contract.transferValve(serialNumber, to);
  await tx.wait();
  res.json({ success: true, txHash: tx.hash });
}));

// Log Maintenance Event
app.post('/api/maintenance', validateBody(maintenanceSchema), asyncHandler(async (req, res) => {
  const { serialNumber, description, reportHash } = req.body;
  
  if (!contract) {
    return res.status(503).json({
      success: false,
      error: 'Service unavailable',
      message: 'Blockchain service is not available'
    });
  }
  
  const tx = await contract.logMaintenance(serialNumber, description, reportHash);
  await tx.wait();
  res.json({ success: true, txHash: tx.hash });
}));

// Request Repair (with escrow)
app.post('/api/repair-request', validateBody(repairRequestSchema), asyncHandler(async (req, res) => {
  const { serialNumber, contractor, amountEth } = req.body;
  
  if (!contract) {
    return res.status(503).json({
      success: false,
      error: 'Service unavailable',
      message: 'Blockchain service is not available'
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
app.post('/api/repair', validateBody(repairSchema), asyncHandler(async (req, res) => {
  const { serialNumber, preTestHash, repairHash, postTestHash } = req.body;
  
  if (!contract) {
    return res.status(503).json({
      success: false,
      error: 'Service unavailable',
      message: 'Blockchain service is not available'
    });
  }
  
  const tx = await contract.logRepair(serialNumber, preTestHash, repairHash, postTestHash);
  await tx.wait();
  res.json({ success: true, txHash: tx.hash });
}));

// Example: Add more endpoints for audit, confirm, etc. as needed

// Import auth routes
import authRoutes from './authRoutesES.js';

// Use auth routes
app.use('/api/auth', authRoutes);

// Start server
app.listen(PORT || 3000, () => {
  console.log(`ValveChain Sidecar API running on port ${PORT || 3000}`);
});
