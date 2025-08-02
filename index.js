import dotenv from 'dotenv';
import express from 'express';
import { ethers } from 'ethers';
import contractABI from './abi/ValveChainABI.json' with { type: 'json' };
import logger from './logger.js';
import { requestLoggingMiddleware, errorLoggingMiddleware } from './middleware/logging.js';
import { metricsMiddleware, register, recordBlockchainOperation } from './metrics.js';

dotenv.config();

const app = express();

// Add request logging and metrics middleware
app.use(requestLoggingMiddleware);
app.use(metricsMiddleware);
app.use(express.json());

const { PRIVATE_KEY, RPC_URL, CONTRACT_ADDRESS, PORT } = process.env;

// Create mock contract for testing environment
const createMockContract = () => ({
  registerValve: async () => ({ hash: 'mock-tx-hash-' + Date.now(), wait: async () => {} }),
  transferValve: async () => ({ hash: 'mock-tx-hash-' + Date.now(), wait: async () => {} }),
  logMaintenance: async () => ({ hash: 'mock-tx-hash-' + Date.now(), wait: async () => {} }),
  requestRepair: async () => ({ hash: 'mock-tx-hash-' + Date.now(), wait: async () => {} }),
  logRepair: async () => ({ hash: 'mock-tx-hash-' + Date.now(), wait: async () => {} }),
});

// Use mock contract for now (in production, this would be the real ethers contract)
const contract = createMockContract();
logger.info('Using mock blockchain contract for testing');

// Health check endpoint
app.get('/api/health', (req, res) => {
  logger.info('Health check requested', { requestId: req.id });
  res.json({ status: 'ValveChain Sidecar API running', requestId: req.id });
});

// Metrics endpoint for Prometheus
app.get('/metrics', async (req, res) => {
  try {
    const metrics = await register.metrics();
    res.set('Content-Type', register.contentType);
    res.send(metrics);
    logger.info('Metrics endpoint accessed', { requestId: req.id });
  } catch (error) {
    logger.error('Error generating metrics', { 
      requestId: req.id,
      error: { message: error.message, stack: error.stack }
    });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Register Valve (native support)
app.post('/api/register-valve', async (req, res) => {
  const { serialNumber, details } = req.body;
  
  logger.info('Register valve request', {
    requestId: req.id,
    serialNumber,
    hasDetails: !!details
  });
  
  if (!serialNumber || !details) {
    logger.warn('Invalid register valve request', {
      requestId: req.id,
      missingFields: { serialNumber: !serialNumber, details: !details }
    });
    recordBlockchainOperation('register-valve', 'failed');
    return res.status(400).json({ error: 'serialNumber and details required' });
  }
  
  try {
    const tx = await contract.registerValve(serialNumber, details);
    await tx.wait();
    
    logger.info('Valve registered successfully', {
      requestId: req.id,
      serialNumber,
      txHash: tx.hash
    });
    recordBlockchainOperation('register-valve', 'success');
    res.json({ success: true, txHash: tx.hash });
  } catch (e) {
    logger.error('Failed to register valve', {
      requestId: req.id,
      serialNumber,
      error: { message: e.message, stack: e.stack }
    });
    recordBlockchainOperation('register-valve', 'failed');
    res.status(500).json({ error: e.message });
  }
});

// Transfer Valve (native support)
app.post('/api/transfer-valve', async (req, res) => {
  const { serialNumber, to } = req.body;
  
  logger.info('Transfer valve request', {
    requestId: req.id,
    serialNumber,
    to
  });
  
  if (!serialNumber || !to) {
    logger.warn('Invalid transfer valve request', {
      requestId: req.id,
      missingFields: { serialNumber: !serialNumber, to: !to }
    });
    recordBlockchainOperation('transfer-valve', 'failed');
    return res.status(400).json({ error: 'serialNumber and to required' });
  }
  
  try {
    const tx = await contract.transferValve(serialNumber, to);
    await tx.wait();
    
    logger.info('Valve transferred successfully', {
      requestId: req.id,
      serialNumber,
      to,
      txHash: tx.hash
    });
    recordBlockchainOperation('transfer-valve', 'success');
    res.json({ success: true, txHash: tx.hash });
  } catch (e) {
    logger.error('Failed to transfer valve', {
      requestId: req.id,
      serialNumber,
      to,
      error: { message: e.message, stack: e.stack }
    });
    recordBlockchainOperation('transfer-valve', 'failed');
    res.status(500).json({ error: e.message });
  }
});

// Log Maintenance Event
app.post('/api/maintenance', async (req, res) => {
  const { serialNumber, description, reportHash } = req.body;
  
  logger.info('Log maintenance request', {
    requestId: req.id,
    serialNumber,
    hasDescription: !!description,
    reportHash
  });
  
  if (!serialNumber || !description || !reportHash) {
    logger.warn('Invalid maintenance request', {
      requestId: req.id,
      missingFields: { 
        serialNumber: !serialNumber, 
        description: !description, 
        reportHash: !reportHash 
      }
    });
    recordBlockchainOperation('maintenance', 'failed');
    return res.status(400).json({ error: 'serialNumber, description, and reportHash required' });
  }
  
  try {
    const tx = await contract.logMaintenance(serialNumber, description, reportHash);
    await tx.wait();
    
    logger.info('Maintenance logged successfully', {
      requestId: req.id,
      serialNumber,
      reportHash,
      txHash: tx.hash
    });
    recordBlockchainOperation('maintenance', 'success');
    res.json({ success: true, txHash: tx.hash });
  } catch (e) {
    logger.error('Failed to log maintenance', {
      requestId: req.id,
      serialNumber,
      reportHash,
      error: { message: e.message, stack: e.stack }
    });
    recordBlockchainOperation('maintenance', 'failed');
    res.status(500).json({ error: e.message });
  }
});

// Request Repair (with escrow)
app.post('/api/repair-request', async (req, res) => {
  const { serialNumber, contractor, amountEth } = req.body;
  
  logger.info('Repair request', {
    requestId: req.id,
    serialNumber,
    contractor,
    amountEth
  });
  
  if (!serialNumber || !contractor || !amountEth) {
    logger.warn('Invalid repair request', {
      requestId: req.id,
      missingFields: { 
        serialNumber: !serialNumber, 
        contractor: !contractor, 
        amountEth: !amountEth 
      }
    });
    recordBlockchainOperation('repair-request', 'failed');
    return res.status(400).json({ error: 'serialNumber, contractor, and amountEth required' });
  }
  
  try {
    const tx = await contract.requestRepair(
      serialNumber,
      contractor,
      { value: ethers.parseEther(amountEth) }
    );
    await tx.wait();
    
    logger.info('Repair requested successfully', {
      requestId: req.id,
      serialNumber,
      contractor,
      amountEth,
      txHash: tx.hash
    });
    recordBlockchainOperation('repair-request', 'success');
    res.json({ success: true, txHash: tx.hash });
  } catch (e) {
    logger.error('Failed to request repair', {
      requestId: req.id,
      serialNumber,
      contractor,
      amountEth,
      error: { message: e.message, stack: e.stack }
    });
    recordBlockchainOperation('repair-request', 'failed');
    res.status(500).json({ error: e.message });
  }
});

// Log Repair
app.post('/api/repair', async (req, res) => {
  const { serialNumber, preTestHash, repairHash, postTestHash } = req.body;
  
  logger.info('Log repair request', {
    requestId: req.id,
    serialNumber,
    preTestHash,
    repairHash,
    postTestHash
  });
  
  if (!serialNumber || !preTestHash || !repairHash || !postTestHash) {
    logger.warn('Invalid repair log request', {
      requestId: req.id,
      missingFields: { 
        serialNumber: !serialNumber, 
        preTestHash: !preTestHash, 
        repairHash: !repairHash,
        postTestHash: !postTestHash
      }
    });
    recordBlockchainOperation('repair', 'failed');
    return res.status(400).json({ error: 'serialNumber, preTestHash, repairHash, and postTestHash required' });
  }
  
  try {
    const tx = await contract.logRepair(serialNumber, preTestHash, repairHash, postTestHash);
    await tx.wait();
    
    logger.info('Repair logged successfully', {
      requestId: req.id,
      serialNumber,
      preTestHash,
      repairHash,
      postTestHash,
      txHash: tx.hash
    });
    recordBlockchainOperation('repair', 'success');
    res.json({ success: true, txHash: tx.hash });
  } catch (e) {
    logger.error('Failed to log repair', {
      requestId: req.id,
      serialNumber,
      preTestHash,
      repairHash,
      postTestHash,
      error: { message: e.message, stack: e.stack }
    });
    recordBlockchainOperation('repair', 'failed');
    res.status(500).json({ error: e.message });
  }
});

// Example: Add more endpoints for audit, confirm, etc. as needed

// Add error handling middleware
app.use(errorLoggingMiddleware);

// Start server
const port = PORT || 3000;
app.listen(port, () => {
  logger.info('ValveChain Sidecar API started', { 
    port,
    environment: process.env.NODE_ENV || 'development'
  });
});
