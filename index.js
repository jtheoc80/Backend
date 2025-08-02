import dotenv from 'dotenv';
import express from 'express';
import { ethers } from 'ethers';
import rateLimit from 'express-rate-limit';
import contractABI from './abi/ValveChainABI.json' assert { type: 'json' };

// Import authentication routes
const authRoutes = require('./authRoutes.js');
const auditLogsRoute = require('./auditLogsRoute.js');
const { UserController, loginRateLimit } = require('./userController.js');

dotenv.config();

const app = express();
app.use(express.json());

// Rate limiting for sensitive operations
const strictRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs for sensitive operations
  message: { error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

// General rate limiting
const generalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes  
  max: 100, // Limit each IP to 100 requests per windowMs
  message: { error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply general rate limiting to all routes
app.use(generalRateLimit);

// Use authentication routes
app.use('/api/auth', authRoutes);
app.use('/api', auditLogsRoute);

// User registration and login routes with rate limiting
app.post('/api/register', strictRateLimit, UserController.register);
app.post('/api/login', loginRateLimit, UserController.login);

const { PRIVATE_KEY, RPC_URL, CONTRACT_ADDRESS, PORT } = process.env;

// Validate required environment variables
if (!PRIVATE_KEY || !RPC_URL || !CONTRACT_ADDRESS) {
  console.error('Missing required environment variables: PRIVATE_KEY, RPC_URL, or CONTRACT_ADDRESS');
  process.exit(1);
}

// Setup ethers provider/wallet
const provider = new ethers.JsonRpcProvider(RPC_URL);
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
const contract = new ethers.Contract(CONTRACT_ADDRESS, contractABI, wallet);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ValveChain Sidecar API running' });
});

// Register Valve (native support) - sensitive operation with strict rate limiting
app.post('/api/register-valve', strictRateLimit, async (req, res) => {
  const { serialNumber, details } = req.body;
  if (!serialNumber || !details) {
    return res.status(400).json({ error: 'serialNumber and details required' });
  }
  try {
    const tx = await contract.registerValve(serialNumber, details);
    await tx.wait();
    res.json({ success: true, txHash: tx.hash });
  } catch (e) {
    console.error('Register valve error:', e.message); // Log for debugging but don't expose details
    res.status(500).json({ error: 'Failed to register valve' });
  }
});

// Transfer Valve (native support)
app.post('/api/transfer-valve', async (req, res) => {
  const { serialNumber, to } = req.body;
  if (!serialNumber || !to) {
    return res.status(400).json({ error: 'serialNumber and to required' });
  }
  try {
    const tx = await contract.transferValve(serialNumber, to);
    await tx.wait();
    res.json({ success: true, txHash: tx.hash });
  } catch (e) {
    console.error('Transfer valve error:', e.message); // Log for debugging but don't expose details
    res.status(500).json({ error: 'Failed to transfer valve' });
  }
});

// Log Maintenance Event
app.post('/api/maintenance', async (req, res) => {
  const { serialNumber, description, reportHash } = req.body;
  if (!serialNumber || !description || !reportHash) {
    return res.status(400).json({ error: 'serialNumber, description, and reportHash required' });
  }
  try {
    const tx = await contract.logMaintenance(serialNumber, description, reportHash);
    await tx.wait();
    res.json({ success: true, txHash: tx.hash });
  } catch (e) {
    console.error('Log maintenance error:', e.message);
    res.status(500).json({ error: 'Failed to log maintenance' });
  }
});

// Request Repair (with escrow)
app.post('/api/repair-request', async (req, res) => {
  const { serialNumber, contractor, amountEth } = req.body;
  if (!serialNumber || !contractor || !amountEth) {
    return res.status(400).json({ error: 'serialNumber, contractor, and amountEth required' });
  }
  try {
    const tx = await contract.requestRepair(
      serialNumber,
      contractor,
      { value: ethers.parseEther(amountEth) }
    );
    await tx.wait();
    res.json({ success: true, txHash: tx.hash });
  } catch (e) {
    console.error('Request repair error:', e.message);
    res.status(500).json({ error: 'Failed to request repair' });
  }
});

// Log Repair
app.post('/api/repair', async (req, res) => {
  const { serialNumber, preTestHash, repairHash, postTestHash } = req.body;
  if (!serialNumber || !preTestHash || !repairHash || !postTestHash) {
    return res.status(400).json({ error: 'serialNumber, preTestHash, repairHash, and postTestHash required' });
  }
  try {
    const tx = await contract.logRepair(serialNumber, preTestHash, repairHash, postTestHash);
    await tx.wait();
    res.json({ success: true, txHash: tx.hash });
  } catch (e) {
    console.error('Log repair error:', e.message);
    res.status(500).json({ error: 'Failed to log repair' });
  }
});

// Example: Add more endpoints for audit, confirm, etc. as needed

// Start server
app.listen(PORT || 3000, () => {
  console.log(`ValveChain Sidecar API running on port ${PORT || 3000}`);
});
