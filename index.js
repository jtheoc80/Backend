import dotenv from 'dotenv';
import express from 'express';
import { ethers } from 'ethers';
import contractABI from './abi/ValveChainABI.json' assert { type: 'json' };

dotenv.config();

const app = express();
app.use(express.json());

const { PRIVATE_KEY, RPC_URL, CONTRACT_ADDRESS, PORT } = process.env;

// Setup ethers provider/wallet
const provider = new ethers.JsonRpcProvider(RPC_URL);
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
const contract = new ethers.Contract(CONTRACT_ADDRESS, contractABI, wallet);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ValveChain Sidecar API running' });
});

// Register Valve (native support)
app.post('/api/register-valve', async (req, res) => {
  const { serialNumber, details } = req.body;
  if (!serialNumber || !details) {
    return res.status(400).json({ error: 'serialNumber and details required' });
  }
  try {
    const tx = await contract.registerValve(serialNumber, details);
    await tx.wait();
    res.json({ success: true, txHash: tx.hash });
  } catch (e) {
    res.status(500).json({ error: e.message });
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
    res.status(500).json({ error: e.message });
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
    res.status(500).json({ error: e.message });
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
    res.status(500).json({ error: e.message });
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
    res.status(500).json({ error: e.message });
  }
});

// Example: Add more endpoints for audit, confirm, etc. as needed

// Start server
app.listen(PORT || 3000, () => {
  console.log(`ValveChain Sidecar API running on port ${PORT || 3000}`);
});
