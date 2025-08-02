require('dotenv').config();
const express = require('express');

const app = express();
app.use(express.json());

// Mock contract for testing
const mockContract = {
  registerValve: () => Promise.resolve({ hash: 'mock-tx-hash', wait: () => Promise.resolve() }),
  transferValve: () => Promise.resolve({ hash: 'mock-tx-hash', wait: () => Promise.resolve() }),
  logMaintenance: () => Promise.resolve({ hash: 'mock-tx-hash', wait: () => Promise.resolve() }),
  requestRepair: () => Promise.resolve({ hash: 'mock-tx-hash', wait: () => Promise.resolve() }),
  logRepair: () => Promise.resolve({ hash: 'mock-tx-hash', wait: () => Promise.resolve() })
};

// For testing, use mock contract, for production use real contract
let contract = mockContract;

if (process.env.NODE_ENV !== 'test') {
  try {
    const { ethers } = require('ethers');
    const contractABI = require('./abi/ValveChainABI.json');
    
    const { PRIVATE_KEY, RPC_URL, CONTRACT_ADDRESS } = process.env;
    
    if (PRIVATE_KEY && RPC_URL && CONTRACT_ADDRESS) {
      const provider = new ethers.JsonRpcProvider(RPC_URL);
      const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
      contract = new ethers.Contract(CONTRACT_ADDRESS, contractABI, wallet);
    }
  } catch (error) {
    console.warn('Failed to initialize blockchain connection, using mock contract:', error.message);
  }
}

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
    if (tx.wait) await tx.wait();
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
    if (tx.wait) await tx.wait();
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
    if (tx.wait) await tx.wait();
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
    const tx = await contract.requestRepair(serialNumber, contractor, { value: amountEth });
    if (tx.wait) await tx.wait();
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
    if (tx.wait) await tx.wait();
    res.json({ success: true, txHash: tx.hash });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = app;